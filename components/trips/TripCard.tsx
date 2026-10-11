import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AvatarStack } from '@/components/ui/Avatar';
import { formatMoney } from '@/lib/currency/currencies';
import { calculateNetBalances, currencyDecimals } from '@/lib/settlement/optimize-debts';
import type { TripListItem } from '@/lib/data';

export function TripCard({ item }: { item: TripListItem }) {
  const { trip, members, me, expenses, payments } = item;
  const decimals = currencyDecimals(trip.base_currency);
  const total = expenses.reduce((sum, e) => sum + e.amount_base_currency, 0);
  const balances = calculateNetBalances(
    expenses,
    payments,
    members.map((m) => m.id),
    decimals
  );
  const mine = balances.find((b) => b.member === me.id)?.balance ?? 0;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="card group flex items-center gap-4 p-4 transition hover:border-slate-300 hover:shadow-lift"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-[17px] font-semibold">{trip.name}</h2>
          {trip.status === 'settled' && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              Settled
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-muted">
          <AvatarStack people={members} />
          <span>
            {members.length} {members.length === 1 ? 'person' : 'people'}
          </span>
          <span className="text-ink-faint">·</span>
          <span className="tabular">{formatMoney(total, trip.base_currency)} spent</span>
        </div>
      </div>

      <div className="text-right">
        {Math.abs(mine) < 10 ** -decimals ? (
          <p className="text-[13px] font-medium text-ink-muted">All square</p>
        ) : (
          <>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              {mine > 0 ? "You're owed" : 'You owe'}
            </p>
            <p className={`tabular text-[15px] font-semibold ${mine > 0 ? 'text-owed' : 'text-owes'}`}>
              {formatMoney(Math.abs(mine), trip.base_currency)}
            </p>
          </>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5" />
    </Link>
  );
}
