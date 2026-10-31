import { describe, expect, it } from 'vitest';
import { getFeatureLimit, hasFeature, resolveEntitlements } from './entitlements.js';
describe('resolveEntitlements', () => {
  const now = new Date('2026-10-31T00:00:00.000Z');
  it('defaults missing subscriptions to free', () => {
    const result=resolveEntitlements(null,now);
    expect(result.planCode).toBe('free'); expect(result.isPaid).toBe(false); expect(result.features.ads).toBe(true);
  });
  it('grants Pro access during an active paid period', () => {
    const result=resolveEntitlements({plan_code:'pro_monthly',status:'active',current_period_end:'2026-11-30T00:00:00.000Z'},now);
    expect(result.planCode).toBe('pro_monthly'); expect(result.isPaid).toBe(true);
    expect(result.features.advanced_exports).toBe(true); expect(result.features.business_workflows).toBe(false);
    expect(result.limits.bulk_job).toBe(30);
  });
  it('removes access after the paid period ends', () => {
    const result=resolveEntitlements({plan_code:'business_monthly',status:'active',current_period_end:'2026-10-30T23:59:59.000Z'},now);
    expect(result.planCode).toBe('free'); expect(result.isPaid).toBe(false);
  });
  it('does not grant access for cancelled or failed subscriptions', () => {
    for (const status of ['cancelled','halted','failed','created']) {
      expect(resolveEntitlements({plan_code:'pro_monthly',status},now).planCode).toBe('free');
    }
  });
  it('fails closed for unknown plan codes', () => {
    const result=resolveEntitlements({plan_code:'founder_unlimited',status:'active',current_period_end:'2026-11-30T00:00:00.000Z'},now);
    expect(result.planCode).toBe('free');
  });
});
describe('entitlement helpers', () => {
  const free=resolveEntitlements(null);
  it('checks boolean features', () => { expect(hasFeature(free,'ads')).toBe(true); expect(hasFeature(free,'business_workflows')).toBe(false); });
  it('returns zero for missing limits', () => { expect(getFeatureLimit(free,'bulk_job')).toBe(0); expect(getFeatureLimit({},'bulk_job')).toBe(0); });
});
