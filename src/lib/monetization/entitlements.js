import { getPlan, PLAN_CATALOG } from './planCatalog.js';
const ACTIVE_STATUSES = new Set(['active', 'authenticated', 'trialing']);
function isWithinPaidPeriod(subscription, now) {
  if (!subscription?.current_period_end) return true;
  const end = new Date(subscription.current_period_end).getTime();
  return Number.isFinite(end) && end > now.getTime();
}
/** Resolve effective access from a trusted subscription record loaded server-side. */
export function resolveEntitlements(subscription, now = new Date()) {
  const active = Boolean(subscription && ACTIVE_STATUSES.has(subscription.status) && isWithinPaidPeriod(subscription, now));
  const plan = active ? getPlan(subscription.plan_code) : PLAN_CATALOG.free;
  const effectivePlan = plan || PLAN_CATALOG.free;
  return {
    planCode:effectivePlan.code, planName:effectivePlan.name, isPaid:effectivePlan.code !== 'free',
    features:{ ...effectivePlan.features }, limits:{ ...effectivePlan.limits },
    subscriptionStatus:active ? subscription.status : (subscription?.status || 'free'),
    currentPeriodEnd:active ? subscription.current_period_end || null : null,
  };
}
export function hasFeature(entitlements, featureKey) {
  return entitlements?.features?.[featureKey] === true;
}
export function getFeatureLimit(entitlements, featureKey) {
  const value = entitlements?.limits?.[featureKey];
  return Number.isInteger(value) ? value : 0;
}
