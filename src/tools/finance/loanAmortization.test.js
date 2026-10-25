import { describe, it, expect } from 'vitest';
import { computeLoanAmortization } from './loanAmortization';

describe('computeLoanAmortization', () => {
  it('computes EMI for 10 lakh at 9% over 5 years', () => {
    const r = computeLoanAmortization({ principal: 1000000, annualRatePct: 9, years: 5 });
    expect(r.months).toBe(60);
    expect(r.emi).toBeCloseTo(20758.355, 2);
    expect(r.totalInterest).toBeCloseTo(245501.3, 0);
  });

  it('ends with a zero balance and principal paid equal to the loan', () => {
    const r = computeLoanAmortization({ principal: 1000000, annualRatePct: 9, years: 5 });
    const last = r.yearly[r.yearly.length - 1];
    expect(last.closingBalance).toBeCloseTo(0, 6);
    const principalTotal = r.yearly.reduce((s, y) => s + y.principalPaid, 0);
    expect(principalTotal).toBeCloseTo(1000000, 4);
  });

  it('builds one yearly row per year of tenure', () => {
    const r = computeLoanAmortization({ principal: 500000, annualRatePct: 8.5, years: 3, months: 0 });
    expect(r.yearly.map(y => y.year)).toEqual([1, 2, 3]);
  });

  it('splits the tenure into years and months', () => {
    const r = computeLoanAmortization({ principal: 200000, annualRatePct: 10, years: 1, months: 6 });
    expect(r.months).toBe(18);
    expect(r.yearly.map(y => y.year)).toEqual([1, 2]);
  });

  it('handles a zero-interest loan by simple division', () => {
    const r = computeLoanAmortization({ principal: 120000, annualRatePct: 0, years: 1 });
    expect(r.emi).toBeCloseTo(10000, 6);
    expect(r.totalInterest).toBeCloseTo(0, 6);
  });

  it('returns empty results for missing input', () => {
    const r = computeLoanAmortization({ principal: 0, annualRatePct: 9, years: 5 });
    expect(r.emi).toBe(0);
    expect(r.yearly).toEqual([]);
  });
});
