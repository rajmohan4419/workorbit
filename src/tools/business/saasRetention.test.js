import { describe, it, expect } from 'vitest';
import { computeSaasRetention, rateMetric } from './saasRetention';

const base = {
  startMrr: 100000, expansionMrr: 15000, contractionMrr: 5000, churnedMrr: 10000,
  startCustomers: 400, churnedCustomers: 40, acquisitionSpend: 1200000, newCustomers: 200,
  arpaMonthly: 2000, grossMarginPct: 80,
};

describe('computeSaasRetention', () => {
  it('computes net and gross revenue retention', () => {
    const r = computeSaasRetention(base);
    expect(r.nrr).toBeCloseTo(100, 6);
    expect(r.grr).toBeCloseTo(85, 6);
  });

  it('computes logo churn and the monthly equivalent', () => {
    const r = computeSaasRetention(base);
    expect(r.logoChurnPct).toBeCloseTo(10, 6);
    expect(r.monthlyChurnPct).toBeCloseTo(0.874161, 4);
  });

  it('computes CAC, LTV, LTV:CAC and payback', () => {
    const r = computeSaasRetention(base);
    expect(r.cac).toBeCloseTo(6000, 6);
    expect(r.ltv).toBeCloseTo(183032.6, 0);
    expect(r.ltvToCac).toBeCloseTo(30.5, 1);
    expect(r.paybackMonths).toBeCloseTo(3.75, 6);
  });

  it('returns null where a ratio cannot be computed, instead of Infinity', () => {
    const r = computeSaasRetention({ ...base, startMrr: 0, startCustomers: 0, churnedCustomers: 0 });
    expect(r.nrr).toBeNull();
    expect(r.grr).toBeNull();
    expect(r.logoChurnPct).toBeNull();
    expect(r.ltv).toBeNull();
  });

  it('treats zero churn as no finite lifetime rather than an infinite LTV', () => {
    const r = computeSaasRetention({ ...base, churnedCustomers: 0, churnedMrr: 0, contractionMrr: 0 });
    expect(r.ltv).toBeNull();
    expect(r.grr).toBeCloseTo(100, 6);
  });

  it('flags inconsistent inputs', () => {
    const r = computeSaasRetention({ ...base, churnedMrr: 150000 });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('caps gross margin at 100% and ignores negative inputs', () => {
    const r = computeSaasRetention({ ...base, grossMarginPct: 250, arpaMonthly: -5 });
    expect(r.ltv).toBeNull(); // no positive gross profit per month
  });
});

describe('rateMetric', () => {
  it('reads metrics against rough benchmarks', () => {
    expect(rateMetric('nrr', 105)).toBe('good');
    expect(rateMetric('nrr', 95)).toBe('ok');
    expect(rateMetric('nrr', 80)).toBe('weak');
    expect(rateMetric('ltvToCac', 3.2)).toBe('good');
    expect(rateMetric('paybackMonths', 20)).toBe('weak');
    expect(rateMetric('grr', null)).toBe('na');
  });
});
