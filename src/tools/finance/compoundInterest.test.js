import { describe, it, expect } from 'vitest';
import { computeCompoundInterest } from './compoundInterest';

describe('computeCompoundInterest', () => {
  it('compounds yearly: 100000 at 10% for 5 years', () => {
    const r = computeCompoundInterest({ principal: 100000, annualRatePct: 10, years: 5, timesPerYear: 1 });
    expect(r.amount).toBeCloseTo(161051, 2);
    expect(r.interest).toBeCloseTo(61051, 2);
    expect(r.effectiveRatePct).toBeCloseTo(10, 6);
  });

  it('compounds monthly, giving a higher maturity than yearly', () => {
    const monthly = computeCompoundInterest({ principal: 100000, annualRatePct: 10, years: 5, timesPerYear: 12 });
    expect(monthly.amount).toBeCloseTo(164530.89, 1);
    expect(monthly.effectiveRatePct).toBeCloseTo(10.4713, 3);
  });

  it('returns the principal unchanged at a zero rate', () => {
    const r = computeCompoundInterest({ principal: 50000, annualRatePct: 0, years: 10, timesPerYear: 4 });
    expect(r.amount).toBe(50000);
    expect(r.interest).toBe(0);
  });

  it('treats invalid or negative inputs as zero', () => {
    const r = computeCompoundInterest({ principal: 'abc', annualRatePct: -5, years: NaN, timesPerYear: 0 });
    expect(r.amount).toBe(0);
    expect(r.interest).toBe(0);
    expect(Number.isFinite(r.effectiveRatePct)).toBe(true);
  });
});
