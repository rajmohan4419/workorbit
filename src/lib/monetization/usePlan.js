import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { PLAN_CATALOG } from './planCatalog';
import { resolveEntitlements, hasFeature as checkFeature, getFeatureLimit } from './entitlements';

export const FREE_PLAN_STATE = Object.freeze({
  plan: 'free',
  planCode: 'free',
  planName: PLAN_CATALOG.free.name,
  isPaid: false,
  isPro: false,
  isBusiness: false,
  features: PLAN_CATALOG.free.features,
  limits: PLAN_CATALOG.free.limits,
  loading: false,
  error: null,
  subscriptionStatus: 'free',
  currentPeriodEnd: null,
});

/**
 * React hook providing reactive plan entitlements for current user.
 * Returns free plan defaults immediately for unauthenticated users without network requests.
 * Queries /api/entitlement with Bearer token for signed-in users.
 */
export function usePlan() {
  const [entitlements, setEntitlements] = useState(FREE_PLAN_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEntitlement = useCallback(async (token) => {
    if (!token) {
      setEntitlements(FREE_PLAN_STATE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/entitlement', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setEntitlements(FREE_PLAN_STATE);
          return;
        }
        throw new Error(`Failed to load plan: ${res.status}`);
      }
      const data = await res.json();
      const resolved = resolveEntitlements({
        plan_code: data.plan_code || data.plan,
        current_period_end: data.expires_at,
        status: data.status || (data.plan ? 'active' : 'free'),
      });
      setEntitlements({
        plan: resolved.planCode,
        planCode: resolved.planCode,
        planName: resolved.planName,
        isPaid: resolved.isPaid,
        isPro: resolved.planCode.startsWith('pro'),
        isBusiness: resolved.planCode.startsWith('business'),
        features: resolved.features,
        limits: resolved.limits,
        subscriptionStatus: resolved.subscriptionStatus,
        currentPeriodEnd: resolved.currentPeriodEnd,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.warn('[usePlan] error fetching entitlement:', err?.message || err);
      setError(err);
      setEntitlements(FREE_PLAN_STATE);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase?.auth) {
      setEntitlements(FREE_PLAN_STATE);
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        await fetchEntitlement(token);
      } else {
        setEntitlements(FREE_PLAN_STATE);
      }
    } catch (err) {
      console.warn('[usePlan] session error:', err);
      setEntitlements(FREE_PLAN_STATE);
    }
  }, [fetchEntitlement]);

  useEffect(() => {
    if (!supabase?.auth) {
      return;
    }

    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const token = data?.session?.access_token;
      if (token) {
        fetchEntitlement(token);
      } else {
        setEntitlements(FREE_PLAN_STATE);
      }
    }).catch(() => {
      if (isMounted) setEntitlements(FREE_PLAN_STATE);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const token = session?.access_token;
      if (token) {
        fetchEntitlement(token);
      } else {
        setEntitlements(FREE_PLAN_STATE);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [fetchEntitlement]);

  const hasFeature = useCallback((featureKey) => {
    return checkFeature(entitlements, featureKey);
  }, [entitlements]);

  const getLimit = useCallback((featureKey) => {
    return getFeatureLimit(entitlements, featureKey);
  }, [entitlements]);

  return {
    ...entitlements,
    loading,
    error,
    hasFeature,
    getLimit,
    refresh,
  };
}
