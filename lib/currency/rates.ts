import 'server-only';

// Exchange rates for converting what you paid into the trip's base currency.
//
// With EXCHANGE_RATE_API_KEY set we use exchangerate-api.com's pair endpoint.
// Without it we fall back to their free open.er-api.com feed, which updates
// daily and is plenty for splitting a dinner bill. Results are cached for an
// hour through Next's fetch cache so a group logging ten expenses in a row
// doesn't hit the API ten times.

const ONE_HOUR = 60 * 60;

export class RateUnavailableError extends Error {}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const key = process.env.EXCHANGE_RATE_API_KEY;

  if (key) {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/pair/${from}/${to}`,
      { next: { revalidate: ONE_HOUR } }
    );
    if (res.ok) {
      const data = (await res.json()) as { result?: string; conversion_rate?: number };
      if (data.result === 'success' && typeof data.conversion_rate === 'number') {
        return data.conversion_rate;
      }
    }
    // Fall through to the free feed if the keyed call fails for any reason.
  }

  const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
    next: { revalidate: ONE_HOUR },
  });
  if (!res.ok) throw new RateUnavailableError(`Could not fetch ${from} rates`);

  const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
  const rate = data.rates?.[to];
  if (data.result !== 'success' || typeof rate !== 'number') {
    throw new RateUnavailableError(`No rate available for ${from} to ${to}`);
  }
  return rate;
}
