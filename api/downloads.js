/* global Buffer */
import { getCorsHeaders, rateLimiter } from './_lib/common.js';
import { requireAdmin } from './_lib/payments.js';
import { getUserFromRequest } from './_lib/entitlements.js';
import { TOOLS } from '../src/data/toolCatalog.js';

const slugs = new Set(TOOLS.map(tool => tool.slug));
export function downloadPeriod(now = new Date()) { return `${now.toISOString().slice(0, 7)}-01`; }
export function validateDownload(body) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.requestId || '')) return null;
  if (!['pdf', 'xlsx'].includes(body?.format)) return null;
  return { requestId: body.requestId, format: body.format, toolSlug: slugs.has(body.toolSlug) ? body.toolSlug : 'document-export' };
}
async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body.length <= 2048 ? JSON.parse(req.body) : null;
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 2048) return null; chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  const headers = { ...getCorsHeaders(req.headers?.origin), 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };
  const reply = (status, data) => { res.writeHead(status, headers); res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }
  if (!['GET', 'POST'].includes(req.method)) return reply(405, { error: 'method_not_allowed' });
  let admin;
  try { admin = requireAdmin(); } catch { return reply(503, { error: 'metering_unavailable' }); }
  const user = await getUserFromRequest(req, admin);
  if (!user || user.is_anonymous) return reply(401, { error: 'sign_in_required' });
  if (rateLimiter.isRateLimited(user.id, 'document-downloads', 60, 60)) return reply(429, { error: 'too_many_requests' });
  const period = downloadPeriod();
  try {
    if (req.method === 'GET') {
      const { data, error } = await admin.from('usage_counters').select('units_used').eq('user_id', user.id).eq('feature_key', 'document_download').eq('period_start', period).maybeSingle();
      if (error) throw error;
      return reply(200, { downloads: data?.units_used || 0, periodStart: period, periodTimezone: 'UTC', mode: 'metering_only', quota: null });
    }
    let parsed;
    try { parsed = validateDownload(await parseBody(req)); } catch { /* invalid input */ }
    if (!parsed) return reply(400, { error: 'invalid_download_request' });
    // Signed-in metering pilot only. No free allowance or new paid quota has been approved.
    // This server-side RPC atomically counts a browser download initiation once per request ID.
    const { data, error } = await admin.rpc('record_document_download', {
      p_user_id: user.id, p_request_id: parsed.requestId, p_format: parsed.format, p_tool_slug: parsed.toolSlug,
    });
    if (error) throw error;
    const usage = Array.isArray(data) ? data[0] : data;
    if (usage?.allowed !== true) return reply(503, { error: 'metering_unavailable' });
    return reply(200, { allowed: true, downloads: usage.units_used, mode: 'metering_only', periodStart: usage.meter_period || period });
  } catch {
    return reply(503, { error: 'metering_unavailable' });
  }
}
