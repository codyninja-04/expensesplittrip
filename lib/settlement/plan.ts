import type { TripBundle } from '@/lib/types';
import {
  calculateMemberSummaries,
  countPairwiseTransfers,
  currencyDecimals,
  optimizeSettlement,
  type MemberSummary,
  type Transfer,
} from './optimize-debts';

export interface SettlementPlan {
  currency: string;
  summaries: MemberSummary[];
  /** What still needs to happen, after any payments already recorded. */
  transfers: Transfer[];
  /** Transfers needed if everyone paid back each payer directly. */
  naiveCount: number;
  totalSpent: number;
}

export function buildSettlementPlan(
  bundle: Pick<TripBundle, 'trip' | 'members' | 'expenses' | 'payments'>
): SettlementPlan {
  const { trip, members, expenses, payments } = bundle;
  const decimals = currencyDecimals(trip.base_currency);

  const summaries = calculateMemberSummaries(
    expenses,
    payments,
    members.map((m) => m.id),
    decimals
  );

  return {
    currency: trip.base_currency,
    summaries,
    transfers: optimizeSettlement(summaries, decimals),
    naiveCount: countPairwiseTransfers(expenses, decimals),
    totalSpent: expenses.reduce((sum, e) => sum + e.amount_base_currency, 0),
  };
}
