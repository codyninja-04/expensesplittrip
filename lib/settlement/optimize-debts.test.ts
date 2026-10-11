import { describe, expect, it } from 'vitest';
import {
  calculateMemberSummaries,
  calculateNetBalances,
  countPairwiseTransfers,
  currencyDecimals,
  optimizeSettlement,
  splitMinor,
} from './optimize-debts';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('splitMinor', () => {
  it('never loses a cent', () => {
    const parts = splitMinor(10000, ['a', 'b', 'c']);
    expect(sum(Array.from(parts.values()))).toBe(10000);
    expect(Array.from(parts.values()).sort()).toEqual([3333, 3333, 3334]);
  });

  it('ignores duplicate people', () => {
    const parts = splitMinor(100, ['a', 'a', 'b']);
    expect(parts.size).toBe(2);
    expect(parts.get('a')).toBe(50);
  });
});

describe('calculateNetBalances', () => {
  it('balances always sum to zero', () => {
    const balances = calculateNetBalances([
      { amount_base_currency: 100, paid_by: 'a', split_among: ['a', 'b', 'c'] },
      { amount_base_currency: 47.31, paid_by: 'b', split_among: ['a', 'b', 'c'] },
      { amount_base_currency: 12.01, paid_by: 'c', split_among: ['a', 'c'] },
    ]);
    expect(Math.round(sum(balances.map((b) => b.balance)) * 100)).toBe(0);
  });

  it('includes members with no expenses at zero', () => {
    const balances = calculateNetBalances([], [], ['a', 'b']);
    expect(balances).toEqual([
      { member: 'a', balance: 0 },
      { member: 'b', balance: 0 },
    ]);
  });

  it('applies recorded payments', () => {
    const expenses = [{ amount_base_currency: 100, paid_by: 'a', split_among: ['a', 'b'] }];
    const before = calculateNetBalances(expenses);
    expect(before.find((b) => b.member === 'b')?.balance).toBe(-50);

    const after = calculateNetBalances(expenses, [{ from_member: 'b', to_member: 'a', amount: 50 }]);
    expect(after.every((b) => b.balance === 0)).toBe(true);
  });

  it('works for zero decimal currencies', () => {
    const balances = calculateNetBalances(
      [{ amount_base_currency: 1000, paid_by: 'a', split_among: ['a', 'b', 'c'] }],
      [],
      [],
      0
    );
    expect(balances.find((b) => b.member === 'a')?.balance).toBe(666);
  });
});

describe('calculateMemberSummaries', () => {
  it('reports paid and share separately', () => {
    const [a] = calculateMemberSummaries([
      { amount_base_currency: 90, paid_by: 'a', split_among: ['a', 'b', 'c'] },
    ]).filter((s) => s.member === 'a');
    expect(a).toMatchObject({ paid: 90, share: 30, balance: 60 });
  });
});

describe('optimizeSettlement', () => {
  it('settles a simple three way trip in two transfers', () => {
    const balances = calculateNetBalances([
      { amount_base_currency: 300, paid_by: 'sarah', split_among: ['sarah', 'wei', 'dan'] },
    ]);
    const plan = optimizeSettlement(balances);
    expect(plan).toHaveLength(2);
    expect(plan.every((t) => t.to === 'sarah' && t.amount === 100)).toBe(true);
  });

  it('collapses chains of debt', () => {
    // a owes b 10, b owes c 10: a should just pay c.
    const plan = optimizeSettlement([
      { member: 'a', balance: -10 },
      { member: 'b', balance: 0 },
      { member: 'c', balance: 10 },
    ]);
    expect(plan).toEqual([{ from: 'a', to: 'c', amount: 10 }]);
  });

  it('pairs exact matches first', () => {
    // Greedy alone would produce 3 transfers here. Exact matching gets 2.
    const plan = optimizeSettlement([
      { member: 'a', balance: 7 },
      { member: 'b', balance: 5 },
      { member: 'c', balance: -5 },
      { member: 'd', balance: -7 },
    ]);
    expect(plan).toHaveLength(2);
  });

  it('fully settles every balance', () => {
    const expenses = [
      { amount_base_currency: 412.5, paid_by: 'a', split_among: ['a', 'b', 'c', 'd'] },
      { amount_base_currency: 88.4, paid_by: 'b', split_among: ['a', 'b'] },
      { amount_base_currency: 63.33, paid_by: 'c', split_among: ['b', 'c', 'd'] },
      { amount_base_currency: 19.99, paid_by: 'd', split_among: ['a', 'b', 'c', 'd'] },
    ];
    const balances = calculateNetBalances(expenses);
    const plan = optimizeSettlement(balances);
    const payments = plan.map((t) => ({ from_member: t.from, to_member: t.to, amount: t.amount }));
    const after = calculateNetBalances(expenses, payments);

    expect(after.every((b) => b.balance === 0)).toBe(true);
    expect(plan.length).toBeLessThanOrEqual(3);
  });
});

describe('countPairwiseTransfers', () => {
  it('counts each owing pair once after netting', () => {
    const count = countPairwiseTransfers([
      { amount_base_currency: 30, paid_by: 'a', split_among: ['a', 'b', 'c'] },
      { amount_base_currency: 30, paid_by: 'b', split_among: ['a', 'b', 'c'] },
    ]);
    // b->a nets to zero, c->a and c->b remain.
    expect(count).toBe(2);
  });
});

describe('currencyDecimals', () => {
  it('knows yen has no cents', () => {
    expect(currencyDecimals('JPY')).toBe(0);
    expect(currencyDecimals('SGD')).toBe(2);
  });
});
