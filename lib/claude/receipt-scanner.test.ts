import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }));

const { parseReceiptJson, ReceiptScanError } = await import('./receipt-scanner');

describe('parseReceiptJson', () => {
  it('reads clean JSON', () => {
    const r = parseReceiptJson(
      '{"description":"Dinner at Ichiran","amount":4800,"currency":"jpy","category":"food","confidence":"high"}'
    );
    expect(r).toEqual({
      description: 'Dinner at Ichiran',
      amount: 4800,
      currency: 'JPY',
      category: 'food',
      confidence: 'high',
    });
  });

  it('survives code fences and string amounts with separators', () => {
    const r = parseReceiptJson('```json\n{"description":"Villa","amount":"1,250,000","currency":"IDR","category":"accommodation"}\n```');
    expect(r.amount).toBe(1250000);
    expect(r.confidence).toBe('low');
  });

  it('falls back on unknown categories and bad currencies', () => {
    const r = parseReceiptJson('{"description":"x","amount":3,"currency":"dollars","category":"snacks"}');
    expect(r.category).toBe('other');
    expect(r.currency).toBe('');
  });

  it('rejects receipts with no total', () => {
    expect(() => parseReceiptJson('{"amount":0}')).toThrow(ReceiptScanError);
    expect(() => parseReceiptJson('sorry, not a receipt')).toThrow(ReceiptScanError);
  });
});
