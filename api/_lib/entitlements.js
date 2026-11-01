/**
 * Identity and entitlement helpers for server code. The service-role client
 * is passed in, so these functions never create their own.
 */
import { resolveEntitlements, hasFeature } from '../../src/lib/monetization/entitlements.js';

export function getBearerToken(req) {
  const header = String(req?.headers?.authorization || '');
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

/** Returns the Supabase user for the request's bearer token, or null. Never throws. */
export async function getUserFromRequest(req, admin) {
  const token = getBearerToken(req);
  if (!token || !admin) return null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/** Plan catalogue row, or null. Inactive plans are returned so callers can decide. */
export async function getPlan(admin, planId) {
  const { data, error } = await admin
    .from('plans')
    .select('id, kind, amount_paise, currency, pass_days, active')
    .eq('id', planId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/** Current entitlement for a user from public.user_subscriptions. */
export async function getActiveEntitlement(admin, userId) {
  const { data, error } = await admin
    .from('user_subscriptions')
    .select('plan_code, current_period_end, cancel_at_period_end, status')
    .eq('user_id', userId)
    .in('status', ['active', 'cancelled', 'halted'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    plan_id: data.plan_code, // backward compatibility
  };
}

/**
 * Checks a specific feature entitlement against the user's active subscription in the DB.
 */
export async function checkUserEntitlement(admin, userId, featureKey) {
  const sub = await getActiveEntitlement(admin, userId);
  const resolved = resolveEntitlements(sub);
  return {
    entitled: hasFeature(resolved, featureKey),
    plan: resolved.planCode,
    entitlements: resolved,
    subscription: sub,
  };
}

/**
 * Server endpoint guard: verifies Bearer token and feature entitlement.
 * Returns 401 if unauthenticated, 403 { error: 'feature_not_entitled', feature } if plan lacks the feature.
 */
export async function requireEntitlement(req, admin, featureKey) {
  const user = await getUserFromRequest(req, admin);
  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: 'sign_in_required',
    };
  }
  const check = await checkUserEntitlement(admin, user.id, featureKey);
  if (!check.entitled) {
    return {
      authorized: false,
      status: 403,
      error: 'feature_not_entitled',
      feature: featureKey,
      user,
      plan: check.plan,
    };
  }
  return {
    authorized: true,
    user,
    plan: check.plan,
    entitlements: check.entitlements,
  };
}
