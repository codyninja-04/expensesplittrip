// Currencies people actually hit on trips out of Singapore, roughly ordered by
// how often they come up. Anything else can still be typed in as a 3 letter code.

export interface CurrencyInfo {
  code: string;
  name: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'SGD', name: 'Singapore dollar', flag: '🇸🇬' },
  { code: 'MYR', name: 'Malaysian ringgit', flag: '🇲🇾' },
  { code: 'THB', name: 'Thai baht', flag: '🇹🇭' },
  { code: 'JPY', name: 'Japanese yen', flag: '🇯🇵' },
  { code: 'IDR', name: 'Indonesian rupiah', flag: '🇮🇩' },
  { code: 'KRW', name: 'South Korean won', flag: '🇰🇷' },
  { code: 'VND', name: 'Vietnamese dong', flag: '🇻🇳' },
  { code: 'TWD', name: 'New Taiwan dollar', flag: '🇹🇼' },
  { code: 'HKD', name: 'Hong Kong dollar', flag: '🇭🇰' },
  { code: 'CNY', name: 'Chinese yuan', flag: '🇨🇳' },
  { code: 'PHP', name: 'Philippine peso', flag: '🇵🇭' },
  { code: 'AUD', name: 'Australian dollar', flag: '🇦🇺' },
  { code: 'NZD', name: 'New Zealand dollar', flag: '🇳🇿' },
  { code: 'USD', name: 'US dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British pound', flag: '🇬🇧' },
  { code: 'CHF', name: 'Swiss franc', flag: '🇨🇭' },
  { code: 'INR', name: 'Indian rupee', flag: '🇮🇳' },
  { code: 'LKR', name: 'Sri Lankan rupee', flag: '🇱🇰' },
  { code: 'AED', name: 'UAE dirham', flag: '🇦🇪' },
  { code: 'TRY', name: 'Turkish lira', flag: '🇹🇷' },
  { code: 'CAD', name: 'Canadian dollar', flag: '🇨🇦' },
];

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

export function formatMoney(amount: number, currency: string, opts: { signed?: boolean } = {}) {
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(Math.abs(amount));
  } catch {
    formatted = `${currency} ${Math.abs(amount).toFixed(2)}`;
  }
  if (opts.signed && amount !== 0) return `${amount > 0 ? '+' : '−'}${formatted}`;
  return amount < 0 ? `−${formatted}` : formatted;
}

/** Display a rate like 0.0091 or 108.4 with sensible precision. */
export function formatRate(rate: number) {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 1) return rate.toFixed(4);
  return rate.toPrecision(4);
}
