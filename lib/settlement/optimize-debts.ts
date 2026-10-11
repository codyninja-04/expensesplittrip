// Debt netting for a trip.
//
// Everything runs in integer minor units (cents for SGD, whole yen for JPY) so
// a S$100 dinner split three ways becomes 3334 + 3333 + 3333 rather than three
// floating point 33.333... values that never quite sum back to zero. Balances
// across the whole trip always add up to exactly 0, which is what makes the
// settlement plan close cleanly.

export interface ExpenseLike {
  amount_base_currency: number;
  paid_by: string;
  split_among: string[];
}

export interface PaymentLike {
  from_member: string;
  to_member: string;
  amount: number;
}

/** positive = the group owes them, negative = they owe the group */
export interface Balance {
  member: string;
  balance: number;
}

export interface MemberSummary extends Balance {
  /** Total they put on their card for the group */
  paid: number;
  /** Their fair share of everything they were part of */
  share: number;
  /** Settlement transfers already sent minus received */
  settled: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** How many decimal places a currency uses. JPY and KRW have none, SGD has two. */
export function currencyDecimals(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

function toMinor(amount: number, decimals: number): number {
  return Math.round(Number(amount) * 10 ** decimals);
}

function toMajor(minor: number, decimals: number): number {
  return minor / 10 ** decimals;
}

/**
 * Split an amount in minor units across people so the parts always sum back to
 * the total. Leftover units go to people in a stable order, so the same expense
 * always produces the same split no matter who views it.
 */
export function splitMinor(totalMinor: number, people: string[]): Map<string, number> {
  const unique = Array.from(new Set(people)).sort();
  const parts = new Map<string, number>();
  if (unique.length === 0) return parts;

  const base = Math.floor(totalMinor / unique.length);
  let remainder = totalMinor - base * unique.length;

  for (const person of unique) {
    const extra = remainder > 0 ? 1 : 0;
    parts.set(person, base + extra);
    remainder -= extra;
  }
  return parts;
}

/**
 * Paid, share and net balance for every member. Pass `members` so people who
 * haven't spent anything yet still show up at zero.
 */
export function calculateMemberSummaries(
  expenses: ExpenseLike[],
  payments: PaymentLike[] = [],
  members: string[] = [],
  decimals = 2
): MemberSummary[] {
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  const settled = new Map<string, number>();
  const all = new Set<string>(members);

  const add = (map: Map<string, number>, key: string, value: number) => {
    all.add(key);
    map.set(key, (map.get(key) ?? 0) + value);
  };

  for (const expense of expenses) {
    if (expense.split_among.length === 0) continue;
    const totalMinor = toMinor(expense.amount_base_currency, decimals);
    add(paid, expense.paid_by, totalMinor);
    for (const [person, part] of splitMinor(totalMinor, expense.split_among)) {
      add(share, person, part);
    }
  }

  for (const payment of payments) {
    const minor = toMinor(payment.amount, decimals);
    add(settled, payment.from_member, minor);
    add(settled, payment.to_member, -minor);
  }

  return Array.from(all).map((member) => {
    const p = paid.get(member) ?? 0;
    const s = share.get(member) ?? 0;
    const st = settled.get(member) ?? 0;
    return {
      member,
      paid: toMajor(p, decimals),
      share: toMajor(s, decimals),
      settled: toMajor(st, decimals),
      balance: toMajor(p - s + st, decimals),
    };
  });
}

export function calculateNetBalances(
  expenses: ExpenseLike[],
  payments: PaymentLike[] = [],
  members: string[] = [],
  decimals = 2
): Balance[] {
  return calculateMemberSummaries(expenses, payments, members, decimals).map(
    ({ member, balance }) => ({ member, balance })
  );
}

/**
 * Turn net balances into as few transfers as possible.
 *
 * Finding the true minimum is NP-hard in general, so this does two passes that
 * get there in practice for friend-group sized trips:
 *   1. Pair off anyone whose debt exactly matches someone else's credit. Each
 *      exact pair settles two people with one transfer.
 *   2. Greedily match the largest remaining debtor with the largest creditor.
 *      Every step zeroes at least one person, so the result is never more than
 *      (people with a non-zero balance - 1) transfers.
 */
export function optimizeSettlement(balances: Balance[], decimals = 2): Transfer[] {
  const creditors = balances
    .map((b) => ({ member: b.member, minor: toMinor(b.balance, decimals) }))
    .filter((b) => b.minor > 0);
  const debtors = balances
    .map((b) => ({ member: b.member, minor: -toMinor(b.balance, decimals) }))
    .filter((b) => b.minor > 0);

  const transfers: Transfer[] = [];
  const push = (from: string, to: string, minor: number) => {
    transfers.push({ from, to, amount: toMajor(minor, decimals) });
  };

  // Pass 1: exact matches.
  for (const debtor of debtors) {
    const match = creditors.find((c) => c.minor > 0 && c.minor === debtor.minor);
    if (match) {
      push(debtor.member, match.member, debtor.minor);
      match.minor = 0;
      debtor.minor = 0;
    }
  }

  // Pass 2: greedy largest-first.
  const byLargest = (a: { minor: number; member: string }, b: { minor: number; member: string }) =>
    b.minor - a.minor || a.member.localeCompare(b.member);

  const openCreditors = creditors.filter((c) => c.minor > 0).sort(byLargest);
  const openDebtors = debtors.filter((d) => d.minor > 0).sort(byLargest);

  let ci = 0;
  let di = 0;
  while (ci < openCreditors.length && di < openDebtors.length) {
    const credit = openCreditors[ci];
    const debt = openDebtors[di];
    const amount = Math.min(credit.minor, debt.minor);

    if (amount > 0) push(debt.member, credit.member, amount);

    credit.minor -= amount;
    debt.minor -= amount;
    if (credit.minor === 0) ci++;
    if (debt.minor === 0) di++;
  }

  return transfers.sort((a, b) => b.amount - a.amount);
}

/**
 * How many transfers it would take if everyone just paid back whoever covered
 * each expense, after netting each pair. Shown next to the optimised plan so
 * the saving is obvious.
 */
export function countPairwiseTransfers(expenses: ExpenseLike[], decimals = 2): number {
  const pair = new Map<string, number>();

  for (const expense of expenses) {
    const totalMinor = toMinor(expense.amount_base_currency, decimals);
    for (const [person, part] of splitMinor(totalMinor, expense.split_among)) {
      if (person === expense.paid_by || part === 0) continue;
      // Normalise the key so A->B and B->A net against each other.
      const [a, b] = [person, expense.paid_by].sort();
      const sign = a === person ? 1 : -1;
      const key = `${a}|${b}`;
      pair.set(key, (pair.get(key) ?? 0) + sign * part);
    }
  }

  let count = 0;
  for (const value of pair.values()) if (value !== 0) count++;
  return count;
}
