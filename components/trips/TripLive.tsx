'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, Plus } from 'lucide-react';
import { ExpenseList } from './ExpenseList';
import { MemberBalances } from './MemberBalances';
import { formatMoney } from '@/lib/currency/currencies';
import { cn } from '@/lib/format';
import { calculateMemberSummaries, currencyDecimals } from '@/lib/settlement/optimize-debts';
import { createClient } from '@/lib/supabase/client';
import type { SettlementPayment, Trip, TripExpense, TripMember } from '@/lib/types';

function upsert<T extends { id: string }>(list: T[], row: T, prepend = true): T[] {
  const exists = list.some((x) => x.id === row.id);
  if (exists) return list.map((x) => (x.id === row.id ? row : x));
  return prepend ? [row, ...list] : [...list, row];
}

const toExpense = (row: TripExpense): TripExpense => ({
  ...row,
  amount_original: Number(row.amount_original),
  amount_base_currency: Number(row.amount_base_currency),
  exchange_rate: row.exchange_rate == null ? null : Number(row.exchange_rate),
});

/**
 * The live heart of a trip. Holds expenses, payments and members in state and
 * listens on Supabase Realtime so when Sarah logs a taxi in Bangkok, everyone
 * else's balances move without a refresh. Balances are recalculated locally
 * from the same pure function the server uses.
 */
export function TripLive({
  trip,
  initialMembers,
  initialExpenses,
  initialPayments,
  meId,
}: {
  trip: Trip;
  initialMembers: TripMember[];
  initialExpenses: TripExpense[];
  initialPayments: SettlementPayment[];
  meId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [payments, setPayments] = useState(initialPayments);
  const [live, setLive] = useState(false);

  // Server navigations (e.g. coming back from the add page) pass fresh props.
  useEffect(() => setMembers(initialMembers), [initialMembers]);
  useEffect(() => setExpenses(initialExpenses), [initialExpenses]);
  useEffect(() => setPayments(initialPayments), [initialPayments]);

  useEffect(() => {
    const supabase = createClient();
    const filter = `trip_id=eq.${trip.id}`;

    const channel = supabase
      .channel(`trip:${trip.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_expenses', filter }, (p) =>
        setExpenses((list) => upsert(list, toExpense(p.new as TripExpense)))
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_expenses', filter }, (p) =>
        setExpenses((list) => upsert(list, toExpense(p.new as TripExpense)))
      )
      // With RLS on, delete events only carry the primary key, so they can't be
      // filtered by trip. Ids we don't have are simply ignored.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trip_expenses' }, (p) =>
        setExpenses((list) => list.filter((e) => e.id !== (p.old as { id?: string }).id))
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'settlement_payments', filter }, (p) => {
        const row = p.new as SettlementPayment;
        setPayments((list) => upsert(list, { ...row, amount: Number(row.amount) }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'settlement_payments' }, (p) =>
        setPayments((list) => list.filter((x) => x.id !== (p.old as { id?: string }).id))
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members', filter }, (p) => {
        if (p.eventType === 'DELETE') return;
        setMembers((list) => upsert(list, p.new as TripMember, false));
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip.id]);

  const decimals = currencyDecimals(trip.base_currency);
  const summaries = useMemo(
    () => calculateMemberSummaries(expenses, payments, members.map((m) => m.id), decimals),
    [expenses, payments, members, decimals]
  );

  const total = expenses.reduce((sum, e) => sum + e.amount_base_currency, 0);
  const me = summaries.find((s) => s.member === meId);
  const myBalance = me?.balance ?? 0;
  const square = Math.abs(myBalance) < 10 ** -decimals / 2;
  const canEdit = trip.status === 'active';
  const anyoneOwes = summaries.some((s) => Math.abs(s.balance) >= 10 ** -decimals);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-muted">Trip total</p>
          <p className="tabular mt-1 text-2xl font-bold tracking-tight">
            {formatMoney(total, trip.base_currency)}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
          </p>
        </div>
        <div
          className={cn(
            'card p-4',
            !square && (myBalance > 0 ? 'border-owed/20 bg-owed-soft' : 'border-owes/20 bg-owes-soft')
          )}
        >
          <p className="text-xs font-medium text-ink-muted">
            {square ? 'Your position' : myBalance > 0 ? "You're owed" : 'You owe'}
          </p>
          <p
            className={cn(
              'tabular mt-1 text-2xl font-bold tracking-tight',
              square ? 'text-ink' : myBalance > 0 ? 'text-owed' : 'text-owes'
            )}
          >
            {square ? 'All square' : formatMoney(Math.abs(myBalance), trip.base_currency)}
          </p>
          <p className="tabular mt-0.5 text-xs text-ink-faint">
            You&apos;ve paid {formatMoney(me?.paid ?? 0, trip.base_currency)}
          </p>
        </div>
      </section>

      {anyoneOwes && (
        <Link
          href={`/trips/${trip.id}/settle`}
          className="card group flex items-center justify-between px-4 py-3 transition hover:border-primary/40"
        >
          <span className="text-sm font-medium">See the settle up plan</span>
          <ArrowRight className="h-4 w-4 text-primary-600 transition group-hover:translate-x-0.5" />
        </Link>
      )}

      <MemberBalances
        tripId={trip.id}
        members={members}
        summaries={summaries}
        currency={trip.base_currency}
        meId={meId}
        canEdit={canEdit}
        onMemberAdded={(m) => setMembers((list) => upsert(list, m, false))}
      />

      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Expenses</h2>
          <span className="flex items-center gap-1.5 text-xs text-ink-faint">
            <span
              className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-owed' : 'bg-slate-300')}
              aria-hidden
            />
            {live ? 'Live' : 'Connecting'}
          </span>
        </div>
        <ExpenseList
          expenses={expenses}
          members={members}
          baseCurrency={trip.base_currency}
          meId={meId}
          canEdit={canEdit}
          onDeleted={(id) => setExpenses((list) => list.filter((e) => e.id !== id))}
        />
      </div>

      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line/70 bg-background/90 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl gap-2 px-4">
            <Link href={`/trips/${trip.id}/add?scan=1`} className="btn-secondary flex-1 py-3">
              <Camera className="h-4 w-4" /> Scan receipt
            </Link>
            <Link href={`/trips/${trip.id}/add`} className="btn-primary flex-1 py-3 shadow-lift">
              <Plus className="h-4 w-4" /> Add expense
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
