import type { Database } from './supabase/types';

type Tables = Database['public']['Tables'];

export type Trip = Tables['trips']['Row'];
export type TripMember = Tables['trip_members']['Row'];
export type TripExpense = Tables['trip_expenses']['Row'];
export type SettlementPayment = Tables['settlement_payments']['Row'];

export type TripStatus = Trip['status'];

export const CATEGORIES = [
  'food',
  'transport',
  'accommodation',
  'activities',
  'shopping',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

/** Everything a trip page needs, loaded in one go. */
export interface TripBundle {
  trip: Trip;
  members: TripMember[];
  expenses: TripExpense[];
  payments: SettlementPayment[];
  me: TripMember;
}

/** Shape returned by the get_trip_invite RPC. */
export interface TripInvite {
  trip_id: string;
  name: string;
  base_currency: string;
  status: TripStatus;
  already_member: boolean;
  members: Array<{ id: string; display_name: string; claimed: boolean }>;
}
