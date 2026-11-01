/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { usePlan } from './usePlan';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

function TestHook({ onHook }) {
  const hookResult = usePlan();
  onHook(hookResult);
  return <div id="hook-state">{hookResult.plan}</div>;
}

describe('usePlan hook', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('returns free plan defaults for unauthenticated users without calling API', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    let latest;
    await act(async () => {
      root.render(<TestHook onHook={(res) => { latest = res; }} />);
    });

    expect(latest.plan).toBe('free');
    expect(latest.isPaid).toBe(false);
    expect(latest.isPro).toBe(false);
    expect(latest.isBusiness).toBe(false);
    expect(latest.hasFeature('advanced_exports')).toBe(false);
    expect(latest.hasFeature('saved_workspaces')).toBe(false);
    expect(latest.hasFeature('bulk_processing')).toBe(false);
    expect(latest.getLimit('advanced_export')).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fetches entitlements with Bearer token for authenticated users', async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'valid_jwt_token' } },
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        plan_code: 'pro_monthly',
        expires_at: futureDate,
        status: 'active',
      }),
    });

    let latest;
    await act(async () => {
      root.render(<TestHook onHook={(res) => { latest = res; }} />);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/entitlement', {
      headers: { Authorization: 'Bearer valid_jwt_token' },
    });
    expect(latest.plan).toBe('pro_monthly');
    expect(latest.isPaid).toBe(true);
    expect(latest.isPro).toBe(true);
    expect(latest.isBusiness).toBe(false);
    expect(latest.hasFeature('advanced_exports')).toBe(true);
    expect(latest.hasFeature('saved_workspaces')).toBe(true);
    expect(latest.hasFeature('bulk_processing')).toBe(true);
    expect(latest.hasFeature('business_workflows')).toBe(false);
    expect(latest.getLimit('advanced_export')).toBe(100);
    expect(latest.getLimit('bulk_job')).toBe(30);
  });

  it('resolves business plan entitlements with business workflows and priority support', async () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'biz_jwt_token' } },
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        plan_code: 'business_annual',
        expires_at: futureDate,
        status: 'active',
      }),
    });

    let latest;
    await act(async () => {
      root.render(<TestHook onHook={(res) => { latest = res; }} />);
    });

    expect(latest.plan).toBe('business_annual');
    expect(latest.isPaid).toBe(true);
    expect(latest.isPro).toBe(false);
    expect(latest.isBusiness).toBe(true);
    expect(latest.hasFeature('advanced_exports')).toBe(true);
    expect(latest.hasFeature('business_workflows')).toBe(true);
    expect(latest.hasFeature('priority_support')).toBe(true);
    expect(latest.getLimit('advanced_export')).toBe(6000);
    expect(latest.getLimit('business_workflow')).toBe(1200);
  });

  it('falls back to free plan when subscription is expired', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'expired_jwt_token' } },
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        plan_code: 'pro_monthly',
        expires_at: pastDate,
        status: 'active',
      }),
    });

    let latest;
    await act(async () => {
      root.render(<TestHook onHook={(res) => { latest = res; }} />);
    });

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(latest.plan).toBe('free');
    expect(latest.isPaid).toBe(false);
    expect(latest.hasFeature('advanced_exports')).toBe(false);
  });

  it('falls back to free plan on 401 unauthorized response', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'invalid_token' } },
    });
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'sign_in_required' }),
    });

    let latest;
    await act(async () => {
      root.render(<TestHook onHook={(res) => { latest = res; }} />);
    });

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(latest.plan).toBe('free');
    expect(latest.isPaid).toBe(false);
  });
});
