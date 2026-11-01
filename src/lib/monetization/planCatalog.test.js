import { describe, it, expect } from 'vitest';
import {
  PLAN_CATALOG,
  getPlan,
  getRazorpayPlanId,
  getPlanPricePaise,
  ONE_TIME_PRODUCTS,
} from './planCatalog';

describe('Commercial Plan Catalog', () => {
  it('defines frozen plans with explicit feature flags', () => {
    expect(PLAN_CATALOG.free).toBeDefined();
    expect(PLAN_CATALOG.pro_monthly).toBeDefined();
    expect(PLAN_CATALOG.pro_annual).toBeDefined();
    expect(PLAN_CATALOG.business_monthly).toBeDefined();
    expect(PLAN_CATALOG.business_annual).toBeDefined();

    expect(Object.isFrozen(PLAN_CATALOG)).toBe(true);
    expect(Object.isFrozen(PLAN_CATALOG.free.features)).toBe(true);
    expect(Object.isFrozen(PLAN_CATALOG.pro_monthly.features)).toBe(true);

    expect(getPlan('free')).toBe(PLAN_CATALOG.free);
    expect(getPlan('pro_monthly')).toBe(PLAN_CATALOG.pro_monthly);
    expect(getPlan('nonexistent')).toBe(null);

    expect(ONE_TIME_PRODUCTS['premium-export-pack']).toBeDefined();
    expect(ONE_TIME_PRODUCTS['bulk-processing-pack']).toBeDefined();
  });

  it('free plan has 0 limits and disables paid features', () => {
    const free = PLAN_CATALOG.free;
    expect(free.amountInr).toBe(0);
    expect(free.features.ads).toBe(true);
    expect(free.features.advanced_exports).toBe(false);
    expect(free.features.saved_workspaces).toBe(false);
    expect(free.features.bulk_processing).toBe(false);
    expect(free.features.business_workflows).toBe(false);
    expect(free.limits.advanced_export).toBe(0);
  });

  it('pro monthly plan has correct pricing and entitlements', () => {
    const proM = PLAN_CATALOG.pro_monthly;
    expect(proM.amountInr).toBe(249);
    expect(proM.billingInterval).toBe('monthly');
    expect(proM.features.ads).toBe(false);
    expect(proM.features.advanced_exports).toBe(true);
    expect(proM.features.saved_workspaces).toBe(true);
    expect(proM.features.bulk_processing).toBe(true);
    expect(proM.features.business_workflows).toBe(false);
    expect(proM.limits.advanced_export).toBe(100);
    expect(proM.limits.bulk_job).toBe(30);
  });

  it('pro annual plan offers discounted annual pricing', () => {
    const proA = PLAN_CATALOG.pro_annual;
    expect(proA.amountInr).toBe(1999);
    expect(proA.billingInterval).toBe('annual');
    expect(proA.limits.advanced_export).toBe(1200);
    expect(proA.limits.bulk_job).toBe(360);
  });

  it('business plans include business workflows and priority support', () => {
    const bizM = PLAN_CATALOG.business_monthly;
    const bizA = PLAN_CATALOG.business_annual;
    expect(bizM.amountInr).toBe(799);
    expect(bizA.amountInr).toBe(7999);
    expect(bizM.features.business_workflows).toBe(true);
    expect(bizM.features.priority_support).toBe(true);
    expect(bizM.limits.advanced_export).toBe(500);
    expect(bizA.limits.advanced_export).toBe(6000);
  });

  it('resolves razorpay plan IDs from environment variables', () => {
    const env = {
      RAZORPAY_PLAN_PRO_MONTHLY: 'plan_pro_m_123',
      RAZORPAY_PLAN_BUSINESS_ANNUAL: 'plan_biz_a_456',
    };
    expect(getRazorpayPlanId('pro_monthly', env)).toBe('plan_pro_m_123');
    expect(getRazorpayPlanId('business_annual', env)).toBe('plan_biz_a_456');
    expect(getRazorpayPlanId('free', env)).toBe(null);
    expect(getRazorpayPlanId('unknown', env)).toBe(null);
  });

  it('calculates plan price in paise accurately', () => {
    expect(getPlanPricePaise('pro_monthly')).toBe(24900);
    expect(getPlanPricePaise('pro_annual')).toBe(199900);
    expect(getPlanPricePaise('business_monthly')).toBe(79900);
    expect(getPlanPricePaise('business_annual')).toBe(799900);
    expect(getPlanPricePaise('free')).toBe(0);
    expect(getPlanPricePaise('unknown')).toBe(null);
  });
});
