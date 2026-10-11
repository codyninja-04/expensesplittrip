import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { isCategory, type Category } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export type ReceiptMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export interface ScannedReceipt {
  description: string;
  amount: number;
  currency: string;
  category: Category;
  /** How sure the model is. Low confidence nudges the user to double check. */
  confidence: 'high' | 'medium' | 'low';
}

export class ReceiptScanError extends Error {}

/**
 * Pull the total, currency and category off a receipt photo in any language.
 *
 * `hintCurrency` helps with ambiguous symbols. A bare "$" could be USD, SGD,
 * AUD, HKD or TWD, and "¥" could be JPY or CNY, so we tell the model which
 * currencies this trip has been using.
 */
export async function scanTripReceipt(
  imageBase64: string,
  mimeType: ReceiptMimeType,
  hintCurrencies: string[] = []
): Promise<ScannedReceipt> {
  const hint =
    hintCurrencies.length > 0
      ? `\nThis group has recently been spending in: ${hintCurrencies.join(', ')}. Use that to resolve ambiguous symbols like "$" or "¥", but trust clear evidence on the receipt (addresses, tax names, language) over the hint.`
      : '';

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
          {
            type: 'text',
            text: `Extract the final total paid, the currency, and a category from this receipt. It could be in any language or currency.

Rules:
- Use the grand total after tax, service charge and discounts. If a tip line is filled in, include it.
- amount is a plain number with no thousands separators. For currencies without decimals (JPY, KRW, VND, IDR) it is a whole number.
- currency is the ISO 4217 code.
- description is short and human, like "Dinner at Ichiran" or "Grab to airport". Translate to English. Max 60 characters.
- category is one of: food, transport, accommodation, activities, shopping, other.
- confidence is "low" if the image is blurry, cut off, or not clearly a receipt.${hint}

Return ONLY valid JSON, no prose:
{"description": string, "amount": number, "currency": string, "category": string, "confidence": "high" | "medium" | "low"}`,
          },
        ],
      },
    ],
  });

  const raw = response.content.find((block) => block.type === 'text');
  const text = raw && raw.type === 'text' ? raw.text : '';
  return parseReceiptJson(text);
}

/** Tolerant parse: strips code fences or stray prose, then validates every field. */
export function parseReceiptJson(text: string): ScannedReceipt {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new ReceiptScanError("Couldn't read that receipt. Try a clearer photo.");

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match[0]);
  } catch {
    throw new ReceiptScanError("Couldn't read that receipt. Try a clearer photo.");
  }

  const amount = typeof data.amount === 'string' ? Number(data.amount.replace(/,/g, '')) : Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ReceiptScanError("Couldn't find a total on that receipt. You can enter it manually.");
  }

  const currency = String(data.currency ?? '').trim().toUpperCase();
  const confidence = data.confidence === 'high' || data.confidence === 'medium' ? data.confidence : 'low';

  return {
    description: String(data.description ?? 'Receipt').trim().slice(0, 120) || 'Receipt',
    amount: Math.round(amount * 100) / 100,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : '',
    category: isCategory(data.category) ? data.category : 'other',
    confidence,
  };
}
