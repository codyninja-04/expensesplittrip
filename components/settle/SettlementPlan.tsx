'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, PartyPopper, RotateCcw, Undo2 } from 'lucide-react';
import { TransactionCard } from './TransactionCard';
import { formatMoney } from '@/lib/currency/currencies';
import { timeLabel } from '@/lib/format';
import type { Transfer } from '@/lib/settlement/optimize-debts';
import type { SettlementPayment, Trip, TripMember } from '@/lib/types';

export function SettlementPlan({
  trip,
  members,
  transfers,
  payments,
  naiveCount,
  meId,
  hasExpenses,
}: {
  trip: Trip;
  members: TripMember[];
  transfers: Transfer[];
  payments: SettlementPayment[];
  naiveCount: number;
  meId: string;
  hasExpenses: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const byId = new Map(members.map((m) => [m.id, m]));
  const active = trip.status === 'active';
  const done = transfers.length === 0;

  async function markPaid(t: Transfer) {
    setError(null);
    const res = await fetch(`/api/trips/${trip.id}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_member: t.from, to_member: t.to, amount: t.amount }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Could not mark that as paid');
      return;
    }
    router.refresh();
  }

  async function undo(paymentId: string) {
    setBusy(paymentId);
    setError(null);
    const res = await fetch(`/api/trips/${trip.id}/settle?payment_id=${paymentId}`, { method: 'DELETE' });
    if (!res.ok) setError((await res.json()).error ?? 'Could not undo');
    setBusy(null);
    router.refresh();
  }

  async function setStatus(status: 'active' | 'settled') {
    setBusy('status');
    setError(null);
    const res = await fetch(`/api/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setError((await res.json()).error ?? 'Could not update the trip');
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Headline */}
      <section className="card p-5">
        {!hasExpenses ? (
          <>
            <p className="text-lg font-semibold">Nothing to settle yet</p>
            <p className="mt-1 text-[15px] text-ink-muted">Add some expenses and the plan shows up here.</p>
          </>
        ) : done ? (
          <div className="flex items-start gap-3">
            <PartyPopper className="mt-0.5 h-6 w-6 shrink-0 text-owed" />
            <div>
              <p className="text-lg font-semibold">Everyone is square</p>
              <p className="mt-1 text-[15px] text-ink-muted">
                {active
                  ? 'Close the trip to lock it so nobody adds anything by accident.'
                  : 'This trip is closed. Reopen it if something was missed.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[22px] font-bold tracking-tight">
              {transfers.length} {transfers.length === 1 ? 'transfer settles' : 'transfers settle'} everyone up
            </p>
            {naiveCount > transfers.length && payments.length === 0 && (
              <p className="mt-1 text-[15px] text-ink-muted">
                Instead of {naiveCount} if everyone paid back each person directly.
              </p>
            )}
            {payments.length > 0 && (
              <p className="mt-1 text-[15px] text-ink-muted">
                {payments.length} already paid, {transfers.length} to go.
              </p>
            )}
          </>
        )}
      </section>

      {error && <p className="text-sm text-owes">{error}</p>}

      {transfers.length > 0 && (
        <ul className="space-y-3">
          {transfers.map((t) => {
            const from = byId.get(t.from);
            const to = byId.get(t.to);
            if (!from || !to) return null;
            return (
              <TransactionCard
                key={`${t.from}-${t.to}-${t.amount}`}
                from={from}
                to={to}
                amount={t.amount}
                currency={trip.base_currency}
                tripName={trip.name}
                meId={meId}
                canMark={active}
                onMarkPaid={() => markPaid(t)}
              />
            );
          })}
        </ul>
      )}

      {payments.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Already paid</h2>
          <ul className="card divide-y divide-line">
            {payments.map((p) => {
              const from = byId.get(p.from_member);
              const to = byId.get(p.to_member);
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-[14px]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-owed" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{from?.display_name}</span>
                    <span className="text-ink-muted"> paid </span>
                    <span className="font-medium">{to?.display_name}</span>
                    <span className="text-ink-faint"> · {timeLabel(p.created_at)}</span>
                  </span>
                  <span className="tabular font-semibold">{formatMoney(p.amount, trip.base_currency)}</span>
                  {active && (
                    <button
                      onClick={() => undo(p.id)}
                      disabled={busy === p.id}
                      className="btn-ghost -mr-2 p-1.5"
                      aria-label="Undo payment"
                      title="Undo"
                    >
                      {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {hasExpenses && done && (
        <button
          onClick={() => setStatus(active ? 'settled' : 'active')}
          disabled={busy === 'status'}
          className={active ? 'btn-primary w-full py-3' : 'btn-secondary w-full py-3'}
        >
          {busy === 'status' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : active ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {active ? 'Close the trip' : 'Reopen trip'}
        </button>
      )}
    </div>
  );
}
