import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './entitlement';
import { requireAdmin } from './_lib/payments';
vi.mock('./_lib/payments', () => ({ requireAdmin: vi.fn() }));

describe('entitlement read for download accounts', () => {
  let admin, query;
  beforeEach(() => {
    query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    admin = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'account-owner' } } }) }, from: vi.fn().mockReturnValue(query) };
    vi.mocked(requireAdmin).mockReturnValue(admin);
  });
  it('returns a normal free state when the authenticated account has no subscription', async () => {
    const res = { writeHead: vi.fn(), end: vi.fn() };
    await handler({ method: 'GET', headers: { authorization: 'Bearer test-token' } }, res);
    expect(res.writeHead.mock.calls[0][0]).toBe(200);
    expect(JSON.parse(res.end.mock.calls[0][0])).toMatchObject({ plan: null, plan_code: null, status: null });
    expect(admin.from).toHaveBeenCalledWith('user_subscriptions');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'account-owner');
  });
  it('never treats an unauthenticated request as an account', async () => {
    const res = { writeHead: vi.fn(), end: vi.fn() };
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.writeHead.mock.calls[0][0]).toBe(401);
    expect(admin.from).not.toHaveBeenCalled();
  });
});
