import { NextResponse } from 'next/server';
import { jsonError, requireUser } from '@/lib/api';
import { getExchangeRate } from '@/lib/currency/rates';
import { isCurrencyCode } from '@/lib/currency/currencies';

export async function GET(request: Request) {
  const { response } = await requireUser();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from')?.toUpperCase();
  const to = searchParams.get('to')?.toUpperCase();
  if (!isCurrencyCode(from) || !isCurrencyCode(to)) return jsonError('from and to must be currency codes');

  try {
    const rate = await getExchangeRate(from, to);
    return NextResponse.json(
      { from, to, rate },
      { headers: { 'Cache-Control': 'private, max-age=600' } }
    );
  } catch {
    return jsonError(`No rate available for ${from} right now`, 502);
  }
}
