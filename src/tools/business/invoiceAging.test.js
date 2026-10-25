import { describe, it, expect } from 'vitest';
import { computeAging, parseDate, bucketFor } from './invoiceAging';

const asOf = '2026-10-31';

describe('parseDate', () => {
  it('reads ISO and day-first Indian dates', () => {
    expect(parseDate('2026-10-31')).toBe(Date.UTC(2026, 9, 31));
    expect(parseDate('31/10/2026')).toBe(Date.UTC(2026, 9, 31));
    expect(parseDate('5-1-2026')).toBe(Date.UTC(2026, 0, 5));
  });

  it('rejects impossible dates and text', () => {
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('next week')).toBeNull();
  });
});

describe('bucketFor', () => {
  it('places days overdue into the right bucket, with edges included', () => {
    expect(bucketFor(0).key).toBe('current');
    expect(bucketFor(1).key).toBe('d1_30');
    expect(bucketFor(30).key).toBe('d1_30');
    expect(bucketFor(31).key).toBe('d31_60');
    expect(bucketFor(91).key).toBe('d90plus');
  });
});

describe('computeAging', () => {
  const invoices = [
    { id: 'INV-1', customer: 'Acme', amount: 10000, paid: 0, dueDate: '2026-10-01' },   // 30 days overdue
    { id: 'INV-2', customer: 'Acme', amount: 5000, paid: 2000, dueDate: '2026-10-15' }, // 16 days, balance 3000
    { id: 'INV-3', customer: 'Beta', amount: 8000, paid: 0, dueDate: '2026-11-30' },    // not yet due
    { id: 'INV-4', customer: 'Gamma', amount: 4000, paid: 0, dueDate: '2026-06-01' },   // 152 days
    { id: 'INV-5', customer: 'Beta', amount: 1000, paid: 1000, dueDate: '2026-01-01' }, // paid, excluded
  ];

  it('totals outstanding balances and overdue amounts', () => {
    const r = computeAging({ invoices, asOf });
    expect(r.outstanding).toBe(10000 + 3000 + 8000 + 4000);
    expect(r.overdue).toBe(10000 + 3000 + 4000);
  });

  it('fills the ageing buckets using balances', () => {
    const r = computeAging({ invoices, asOf });
    expect(r.buckets.current).toBe(8000);
    expect(r.buckets.d1_30).toBe(10000 + 3000);
    expect(r.buckets.d90plus).toBe(4000);
  });

  it('ranks customers by balance', () => {
    const r = computeAging({ invoices, asOf });
    expect(r.byCustomer[0]).toEqual({ customer: 'Acme', balance: 13000 });
  });

  it('derives the due date from invoice date plus terms', () => {
    const r = computeAging({
      invoices: [{ id: 'X', customer: 'Z', amount: 100, invoiceDate: '2026-09-01', termsDays: 30 }],
      asOf,
    });
    expect(r.rows[0].daysOverdue).toBe(30); // due 2026-10-01
  });

  it('accepts Indian day-first dates', () => {
    const r = computeAging({ invoices: [{ id: 'X', customer: 'Z', amount: 100, dueDate: '01/10/2026' }], asOf });
    expect(r.rows[0].daysOverdue).toBe(30);
  });

  it('warns about rows it cannot use instead of silently dropping them', () => {
    const r = computeAging({
      invoices: [
        { id: 'BAD-AMT', amount: 'abc', dueDate: '2026-10-01' },
        { id: 'BAD-DATE', amount: 100, dueDate: 'soon' },
      ],
      asOf,
    });
    expect(r.warnings).toHaveLength(2);
    expect(r.outstanding).toBe(0);
  });

  it('rejects an invalid as-of date', () => {
    expect(() => computeAging({ invoices: [], asOf: 'nope' })).toThrow();
  });
});
