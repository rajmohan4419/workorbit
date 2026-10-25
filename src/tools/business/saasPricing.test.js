import { describe, it, expect } from 'vitest';
import { computeSaasPricing } from './saasPricing';

const base = {
  seats: 25, perSeatPrice: 800, flatPrice: 15000,
  tier1Seats: 10, tier1Price: 1000, tier2Price: 600,
  usageUnits: 150000, includedUnits: 50000, usagePer1000: 20,
  annualDiscountPct: 10, customers: 100,
};

describe('computeSaasPricing', () => {
  it('prices each model for the customer profile', () => {
    const r = computeSaasPricing(base);
    expect(r.perSeat.monthly).toBe(20000);
    expect(r.flat.monthly).toBe(15000);
    expect(r.tiered.monthly).toBe(19000);
    expect(r.usage.monthly).toBe(2000);
  });

  it('applies the annual discount', () => {
    const r = computeSaasPricing(base);
    expect(r.perSeat.annual).toBeCloseTo(216000, 6);
  });

  it('multiplies monthly price by customer count for MRR', () => {
    const r = computeSaasPricing(base);
    expect(r.perSeat.mrr).toBe(2000000);
    expect(r.flat.mrr).toBe(1500000);
  });

  it('bills usage only above the included allowance', () => {
    const r = computeSaasPricing({ ...base, usageUnits: 40000 });
    expect(r.usage.monthly).toBe(0);
  });

  it('uses graduated tiers: a seat count below the first tier pays only tier one', () => {
    const r = computeSaasPricing({ ...base, seats: 4 });
    expect(r.tiered.monthly).toBe(4000);
  });

  it('caps the discount at 100% and treats bad input as zero', () => {
    const r = computeSaasPricing({ ...base, annualDiscountPct: 500, perSeatPrice: 'x' });
    expect(r.perSeat.monthly).toBe(0);
    expect(r.perSeat.annual).toBe(0);
  });
});
