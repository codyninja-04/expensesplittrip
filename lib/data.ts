import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Trip, TripBundle, TripExpense, TripMember, SettlementPayment } from '@/lib/types';

export const getUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Everything for one trip, or null if it doesn't exist or you aren't in it. */
export const getTripBundle = cache(async (tripId: string): Promise<TripBundle | null> => {
  const user = await getUser();
  if (!user || !isUuid(tripId)) return null;

  const supabase = createClient();
  const [tripRes, membersRes, expensesRes, paymentsRes] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
    supabase.from('trip_members').select('*').eq('trip_id', tripId).order('created_at'),
    supabase
      .from('trip_expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }),
    supabase
      .from('settlement_payments')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }),
  ]);

  const trip = tripRes.data;
  const members = membersRes.data ?? [];
  const me = members.find((m) => m.user_id === user.id);
  if (!trip || !me) return null;

  return {
    trip,
    members,
    expenses: (expensesRes.data ?? []).map(normaliseExpense),
    payments: (paymentsRes.data ?? []).map(normalisePayment),
    me,
  };
});

export interface TripListItem {
  trip: Trip;
  members: TripMember[];
  me: TripMember;
  expenses: TripExpense[];
  payments: SettlementPayment[];
}

export async function getMyTrips(): Promise<TripListItem[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = createClient();
  const { data: mine } = await supabase.from('trip_members').select('trip_id').eq('user_id', user.id);
  const tripIds = (mine ?? []).map((m) => m.trip_id);
  if (tripIds.length === 0) return [];

  const [tripsRes, membersRes, expensesRes, paymentsRes] = await Promise.all([
    supabase.from('trips').select('*').in('id', tripIds).order('created_at', { ascending: false }),
    supabase.from('trip_members').select('*').in('trip_id', tripIds).order('created_at'),
    supabase.from('trip_expenses').select('*').in('trip_id', tripIds),
    supabase.from('settlement_payments').select('*').in('trip_id', tripIds),
  ]);

  const members = membersRes.data ?? [];
  const expenses = (expensesRes.data ?? []).map(normaliseExpense);
  const payments = (paymentsRes.data ?? []).map(normalisePayment);

  return (tripsRes.data ?? []).flatMap((trip) => {
    const tripMembers = members.filter((m) => m.trip_id === trip.id);
    const me = tripMembers.find((m) => m.user_id === user.id);
    if (!me) return [];
    return [
      {
        trip,
        members: tripMembers,
        me,
        expenses: expenses.filter((e) => e.trip_id === trip.id),
        payments: payments.filter((p) => p.trip_id === trip.id),
      },
    ];
  });
}

// PostgREST returns Postgres numeric as strings in some setups. Coerce once at
// the edge so the rest of the app can trust these are numbers.
export function normaliseExpense(e: TripExpense): TripExpense {
  return {
    ...e,
    amount_original: Number(e.amount_original),
    amount_base_currency: Number(e.amount_base_currency),
    exchange_rate: e.exchange_rate == null ? null : Number(e.exchange_rate),
  };
}

export function normalisePayment(p: SettlementPayment): SettlementPayment {
  return { ...p, amount: Number(p.amount) };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
