import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, requireUser, zodMessage } from '@/lib/api';
import { ReceiptScanError, scanTripReceipt } from '@/lib/claude/receipt-scanner';

export const maxDuration = 30;

// Claude accepts images up to 5MB. Base64 inflates size by about a third.
const MAX_BASE64_LENGTH = Math.floor((5 * 1024 * 1024 * 4) / 3);

const scanSchema = z.object({
  trip_id: z.string().uuid(),
  image: z.string().min(100).max(MAX_BASE64_LENGTH, 'That photo is too large'),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
});

export async function POST(request: Request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError('Receipt scanning is not configured yet', 503);
  }

  const parsed = scanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const { trip_id, mime_type } = parsed.data;
  // Accept both raw base64 and a data URL.
  const image = parsed.data.image.replace(/^data:[^;]+;base64,/, '');

  // Membership check through RLS, plus recent currencies as a hint for "$".
  const [{ data: trip }, { data: recent }] = await Promise.all([
    supabase.from('trips').select('id, base_currency').eq('id', trip_id).maybeSingle(),
    supabase
      .from('trip_expenses')
      .select('currency_original')
      .eq('trip_id', trip_id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (!trip) return jsonError('Trip not found', 404);

  const hints = Array.from(
    new Set([...(recent ?? []).map((r) => r.currency_original), trip.base_currency])
  );

  try {
    const receipt = await scanTripReceipt(image, mime_type, hints);
    return NextResponse.json(receipt);
  } catch (err) {
    if (err instanceof ReceiptScanError) return jsonError(err.message, 422);
    console.error('Receipt scan failed', err);
    return jsonError('Scanning is having a moment. Enter it manually for now.', 502);
  }
}
