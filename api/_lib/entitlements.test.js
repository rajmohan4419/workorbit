import { describe, it, expect, vi } from 'vitest';
import { requireEntitlement, checkUserEntitlement, getActiveEntitlement, getBearerToken } from './entitlements.js';

describe('api/_lib/entitlements', () => {
  it('extracts bearer token accurately', () => {
    expect(getBearerToken({ headers: { authorization: 'Bearer token_123' } })).toBe('token_123');
    expect(getBearerToken({ headers: { authorization: 'Basic xyz' } })).toBe(null);
    expect(getBearerToken({})).toBe(null);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const mockAdmin = { auth: { getUser: vi.fn().mockResolvedValue({ data: null, error: new Error('Invalid token') }) } };
    const req = { headers: {} };
    const result = await requireEntitlement(req, mockAdmin, 'advanced_exports');
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toBe('sign_in_required');
  });

  it('rejects unentitled users with 403 feature_not_entitled', async () => {
    const mockAdmin = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user_free' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    const req = { headers: { authorization: 'Bearer valid_token' } };
    const result = await requireEntitlement(req, mockAdmin, 'advanced_exports');
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toBe('feature_not_entitled');
    expect(result.feature).toBe('advanced_exports');
  });

  it('allows entitled users with authorized: true', async () => {
    const mockAdmin = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user_pro' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        plan_code: 'pro_monthly',
                        status: 'active',
                        current_period_end: new Date(Date.now() + 86400000).toISOString(),
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    const req = { headers: { authorization: 'Bearer valid_token' } };
    const result = await requireEntitlement(req, mockAdmin, 'advanced_exports');
    expect(result.authorized).toBe(true);
    expect(result.plan).toBe('pro_monthly');
    expect(result.entitlements.features.advanced_exports).toBe(true);

    const active = await getActiveEntitlement(mockAdmin, 'user_pro');
    expect(active.plan_code).toBe('pro_monthly');
    expect(active.plan_id).toBe('pro_monthly');

    const check = await checkUserEntitlement(mockAdmin, 'user_pro', 'advanced_exports');
    expect(check.entitled).toBe(true);
    expect(check.plan).toBe('pro_monthly');
  });
});
