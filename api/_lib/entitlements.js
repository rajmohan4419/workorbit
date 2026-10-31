/**
 * Identity and entitlement helpers for server code. The service-role client
 * is passed in, so these functions never create their own.
 */

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

/** Current entitlement for a user, using the same rule as the active_plan SQL function. */
export async function getActiveEntitlement(admin, userId) {
  const { data, error } = await admin
    .from('subscriptions')
    .select('plan_id, current_period_end, cancel_at_period_end, status')
    .eq('user_id', userId)
    .in('status', ['active', 'cancelled', 'halted'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
