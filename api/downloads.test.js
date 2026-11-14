import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { downloadPeriod, validateDownload } from './downloads';
import { requireAdmin } from './_lib/payments';
vi.mock('./_lib/payments', () => ({ requireAdmin: vi.fn() }));

const requestId = 'c6118427-10ca-409d-a315-98499b392200';
const call = async (req) => {
  const res = { writeHead: vi.fn(), end: vi.fn() };
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { requestId, format: 'pdf', toolSlug: 'gst-invoice-generator' }, ...req }, res);
  return { status: res.writeHead.mock.calls[0][0], body: JSON.parse(res.end.mock.calls[0][0]) };
};
describe('account download metering', () => {
  let admin;
  beforeEach(() => {
    admin = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: crypto.randomUUID() } } }) }, rpc: vi.fn().mockResolvedValue({ data: [{ allowed: true, units_used: 1 }] }) };
    vi.mocked(requireAdmin).mockReturnValue(admin);
  });
  it('requires authenticated, non-anonymous identity before recording anything', async () => {
    expect((await call({ headers: {} })).status).toBe(401);
    expect(admin.rpc).not.toHaveBeenCalled();
    admin.auth.getUser.mockResolvedValue({ data: { user: { id: 'anonymous', is_anonymous: true } } });
    expect((await call({})).status).toBe(401);
  });
  it('ignores client user, units, quota and metadata; records only safe metadata', async () => {
    const result = await call({ body: { requestId, format: 'xlsx', toolSlug: 'private customer file.xlsx', userId: 'attacker', units: -99, limit: 99999, metadata: { contents: 'secret' } } });
    expect(result.status).toBe(200);
    const args = admin.rpc.mock.calls[0][1];
    expect(args.p_user_id).toBe((await admin.auth.getUser()).data.user.id);
    expect(args).toEqual({ p_user_id: (await admin.auth.getUser()).data.user.id, p_request_id: requestId, p_format: 'xlsx', p_tool_slug: 'document-export' });
    expect(JSON.stringify(args)).not.toContain('secret');
    expect(result.body.allowed).toBe(true);
  });
  it('uses the same idempotency key on retries and fails closed on store errors', async () => {
    await call({}); await call({});
    expect(admin.rpc.mock.calls[0][1].p_request_id).toBe(admin.rpc.mock.calls[1][1].p_request_id);
    admin.rpc.mockResolvedValue({ error: new Error('database internal details') });
    expect(await call({})).toEqual({ status: 503, body: { error: 'metering_unavailable' } });
  });
  it('validates supported formats and request IDs', async () => {
    expect((await call({ body: { requestId, format: 'png' } })).status).toBe(400);
    expect((await call({ body: '{invalid' })).status).toBe(400);
    expect(validateDownload({ requestId: 'x', format: 'pdf' })).toBeNull();
    expect(downloadPeriod(new Date('2026-11-30T23:59:59Z'))).toBe('2026-11-01');
    expect(downloadPeriod(new Date('2026-12-01T00:00:00Z'))).toBe('2026-12-01');
  });
  it('reads usage for the verified owner only', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { units_used: 12 } }) };
    admin.from = vi.fn().mockReturnValue(query);
    const result = await call({ method: 'GET' });
    expect(result.body).toMatchObject({ downloads: 12, mode: 'metering_only', quota: null });
    expect(query.eq).toHaveBeenCalledWith('user_id', (await admin.auth.getUser()).data.user.id);
    expect(admin.rpc).not.toHaveBeenCalled();
  });
});
