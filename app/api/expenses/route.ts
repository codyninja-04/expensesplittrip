import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbMessage, jsonError, requireUser, zodMessage } from '@/lib/api';
import { isUuid, normaliseExpense } from '@/lib/data';
import { getExchangeRate, RateUnavailableError } from '@/lib/currency/rates';
import { currencyDecimals } from '@/lib/settlement/optimize-debts';
import { CATEGORIES } from '@/lib/types';

const createExpenseSchema = z.object({
  trip_id: z.string().uuid(),
  description: z.string().trim().min(1, 'Add a short description').max(120),
  amount_original: z.coerce.number().positive('Amount must be more than zero').max(1e12),
  currency_original: z.string().regex(/^[A-Z]{3}$/, 'Pick a currency'),
  // Optional manual override, e.g. the rate your card actually charged.
  exchange_rate: z.coerce.number().positive().max(1e7).nullish(),
  category: z.enum(CATEGORIES).default('other'),
  paid_by: z.string().uuid(),
  split_among: z.array(z.string().uuid()).min(1, 'Pick at least one person to split with').max(50),
  photo_url: z.string().max(300).nullish(),
});

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (response) return response;

  const parsed = createExpenseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const input = parsed.data;

  // Load the trip (RLS confirms membership) and the caller's member row.
  const [{ data: trip }, { data: me }] = await Promise.all([
    supabase.from('trips').select('id, base_currency, status').eq('id', input.trip_id).maybeSingle(),
    supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', input.trip_id)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  if (!trip || !me) return jsonError('Trip not found', 404);
  if (trip.status !== 'active') return jsonError('This trip is closed. Reopen it to add expenses.', 409);

  // Receipt photos must live inside this trip's folder.
  if (input.photo_url && !input.photo_url.startsWith(`${trip.id}/`)) {
    return jsonError('Invalid receipt photo');
  }

  let rate = 1;
  if (input.currency_original !== trip.base_currency) {
    if (input.exchange_rate) {
      rate = input.exchange_rate;
    } else {
      try {
        rate = await getExchangeRate(input.currency_original, trip.base_currency);
      } catch (err) {
        const message =
          err instanceof RateUnavailableError
            ? `Couldn't get a ${input.currency_original} rate right now. Enter the rate manually.`
            : 'Exchange rate lookup failed';
        return jsonError(message, 502);
      }
    }
  }

  const decimals = currencyDecimals(trip.base_currency);
  const factor = 10 ** decimals;
  const amountBase = Math.round(input.amount_original * rate * factor) / factor;

  const { data, error } = await supabase
    .from('trip_expenses')
    .insert({
      trip_id: trip.id,
      added_by: me.id,
      description: input.description,
      amount_original: input.amount_original,
      currency_original: input.currency_original,
      amount_base_currency: amountBase,
      exchange_rate: input.currency_original === trip.base_currency ? null : rate,
      category: input.category,
      paid_by: input.paid_by,
      split_among: Array.from(new Set(input.split_among)),
      photo_url: input.photo_url ?? null,
    })
    .select()
    .single();

  if (error) return jsonError(dbMessage(error, 'Could not save the expense'), 500);
  return NextResponse.json(normaliseExpense(data), { status: 201 });
}

export async function DELETE(request: Request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!isUuid(id)) return jsonError('id is required');

  const { data, error } = await supabase
    .from('trip_expenses')
    .delete()
    .eq('id', id)
    .select('photo_url');

  if (error) return jsonError(dbMessage(error, 'Could not delete the expense'), 500);
  if (!data || data.length === 0) return jsonError('Expense not found or the trip is closed', 404);

  const photo = data[0].photo_url;
  if (photo) await supabase.storage.from('receipts').remove([photo]);

  return NextResponse.json({ ok: true });
}
