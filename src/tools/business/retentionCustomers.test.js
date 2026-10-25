import { describe, it, expect } from 'vitest';
import { retentionFromCustomers } from './retentionCustomers';

describe('retentionFromCustomers', () => {
  const rows = [
    { customer: 'A', startMrr: '1000', endMrr: '1500' }, // expansion 500
    { customer: 'B', startMrr: '2000', endMrr: '1200' }, // downgrade 800
    { customer: 'C', startMrr: '3000', endMrr: '0' },    // churned 3000
    { customer: 'D', startMrr: '0', endMrr: '4000' },    // new, not in retention
    { customer: 'E', startMrr: '1000', endMrr: '1000' }, // flat
  ];

  it('splits each customer into expansion, downgrade or churn', () => {
    const { totals } = retentionFromCustomers(rows);
    expect(totals.startMrr).toBe(7000);
    expect(totals.expansionMrr).toBe(500);
    expect(totals.contractionMrr).toBe(800);
    expect(totals.churnedMrr).toBe(3000);
    expect(totals.startCustomers).toBe(4);
    expect(totals.churnedCustomers).toBe(1);
    expect(totals.newCustomers).toBe(1);
  });

  it('gives the same NRR as the hand-built figures', () => {
    const { totals } = retentionFromCustomers(rows);
    const nrr = (totals.startMrr + totals.expansionMrr - totals.contractionMrr - totals.churnedMrr) / totals.startMrr * 100;
    expect(nrr).toBeCloseTo((7000 + 500 - 800 - 3000) / 7000 * 100, 6);
  });

  it('warns on rows with unreadable MRR and skips them', () => {
    const r = retentionFromCustomers([{ customer: 'X', startMrr: 'n/a', endMrr: '5' }]);
    expect(r.warnings).toHaveLength(1);
    expect(r.totals.startCustomers).toBe(0);
  });
});
