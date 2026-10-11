'use client';

import { ChevronDown } from 'lucide-react';
import { CURRENCIES } from '@/lib/currency/currencies';
import { cn } from '@/lib/format';

export function CurrencySelect({
  value,
  onChange,
  id,
  className,
  compact = false,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  className?: string;
  compact?: boolean;
}) {
  const known = CURRENCIES.some((c) => c.code === value);

  return (
    <div className={cn('relative', className)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input appearance-none pr-9 font-medium"
      >
        {!known && <option value={value}>{value}</option>}
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code}
            {compact ? '' : ` · ${c.name}`}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
    </div>
  );
}
