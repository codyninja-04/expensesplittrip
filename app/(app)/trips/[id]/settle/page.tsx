import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { SettlementPlan } from '@/components/settle/SettlementPlan';
import { formatMoney } from '@/lib/currency/currencies';
import { getTripBundle } from '@/lib/data';
import { buildSettlementPlan } from '@/lib/settlement/plan';

export const metadata: Metadata = { title: 'Settle up' };

export default async function SettlePage({ params }: { params: { id: string } }) {
  const bundle = await getTripBundle(params.id);
  if (!bundle) notFound();

  const plan = buildSettlementPlan(bundle);
  const me = bundle.me;
  const myPaynowMissing = !me.paynow_number && plan.transfers.some((t) => t.to === me.id);

  return (
    <div className="animate-fade-in">
      <Link
        href={`/trips/${params.id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> {bundle.trip.name}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Settle up</h1>
      <p className="tabular mb-5 mt-0.5 text-sm text-ink-muted">
        {formatMoney(plan.totalSpent, plan.currency)} across {bundle.expenses.length}{' '}
        {bundle.expenses.length === 1 ? 'expense' : 'expenses'}
      </p>

      {myPaynowMissing && (
        <Link
          href="/settings"
          className="mb-4 block rounded-2xl border border-primary/20 bg-primary-50 px-4 py-3 text-[14px] text-primary-700"
        >
          People owe you money. <span className="font-semibold underline">Add your PayNow number</span> so
          they can pay you with a QR scan.
        </Link>
      )}

      <SettlementPlan
        trip={bundle.trip}
        members={bundle.members}
        transfers={plan.transfers}
        payments={bundle.payments}
        naiveCount={plan.naiveCount}
        meId={me.id}
        hasExpenses={bundle.expenses.length > 0}
      />
    </div>
  );
}
