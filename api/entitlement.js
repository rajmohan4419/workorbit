import { getCorsHeaders } from './_lib/common.js';
import { requireAdmin } from './_lib/payments.js';
import { getUserFromRequest, getActiveEntitlement } from './_lib/entitlements.js';

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req.headers?.origin);
  const headers = { ...corsHeaders, 'Cache-Control': 'private, no-store' };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, headers);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let admin;
  try {
    admin = requireAdmin();
  } catch {
    res.writeHead(503, headers);
    res.end(JSON.stringify({ error: 'Service unavailable' }));
    return;
  }

  const user = await getUserFromRequest(req, admin);
  if (!user) {
    res.writeHead(401, headers);
    res.end(JSON.stringify({ error: 'sign_in_required' }));
    return;
  }

  try {
    const entitlement = await getActiveEntitlement(admin, user.id);
    const planCode = entitlement?.plan_code || entitlement?.plan_id || null;
    res.writeHead(200, headers);
    res.end(JSON.stringify({
      plan: planCode,
      plan_code: planCode,
      expires_at: entitlement?.current_period_end || null,
      cancel_at_period_end: entitlement?.cancel_at_period_end || false,
      status: entitlement?.status || null,
    }));
  } catch (err) {
    console.error('[ENTITLEMENT ERROR]', err?.message || err);
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: 'Could not load plan' }));
  }
}
