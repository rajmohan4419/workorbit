import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const PRO_STORAGE_KEY = 'orbitboard_pro_session';
const USAGE_STORAGE_KEY = 'orbitboard_tool_usage';
const PRO_EVENT = 'orbitboard:pro-change';

const ProContext = createContext(null);

function readProSession() {
  if (typeof window === 'undefined') return { isPro: false, daysRemaining: 0, session: null };
  try {
    const raw = localStorage.getItem(PRO_STORAGE_KEY);
    if (!raw) return { isPro: false, daysRemaining: 0, session: null };
    const session = JSON.parse(raw);
    const expiresAt = session?.expiresAt ? new Date(session.expiresAt).getTime() : 0;
    const now = Date.now();
    if (expiresAt > now) {
      const daysRemaining = Math.max(1, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
      return { isPro: true, daysRemaining, session };
    }
    return { isPro: false, daysRemaining: 0, session: null };
  } catch {
    return { isPro: false, daysRemaining: 0, session: null };
  }
}

function readUsageMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function ProProvider({ children }) {
  const [proState, setProState] = useState(readProSession);
  const [usageMap, setUsageMap] = useState(readUsageMap);
  const [proModal, setProModal] = useState({
    isOpen: false,
    toolSlug: '',
    toolName: '',
    actionName: '',
    onUnlock: null,
  });

  const syncProState = useCallback(() => {
    setProState(readProSession());
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === PRO_STORAGE_KEY || e.key === USAGE_STORAGE_KEY) {
        syncProState();
        setUsageMap(readUsageMap());
      }
    };
    const handleCustom = () => {
      syncProState();
      setUsageMap(readUsageMap());
    };

    const handleRequirePro = (e) => {
      setProModal({
        isOpen: true,
        toolSlug: e.detail?.toolSlug || '',
        toolName: e.detail?.toolName || 'this tool',
        actionName: 'Download file',
        onUnlock: null,
      });
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(PRO_EVENT, handleCustom);
    window.addEventListener('orbitboard:require-pro', handleRequirePro);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(PRO_EVENT, handleCustom);
      window.removeEventListener('orbitboard:require-pro', handleRequirePro);
    };
  }, [syncProState]);

  const activatePro = useCallback(({ paymentId = '', orderId = '', days = 30 } = {}) => {
    const now = Date.now();
    const expiresAt = new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
    const session = {
      isPro: true,
      activatedAt: new Date(now).toISOString(),
      expiresAt,
      orderId,
      paymentId,
      plan: 'pro-monthly',
    };
    try {
      localStorage.setItem(PRO_STORAGE_KEY, JSON.stringify(session));
      window.dispatchEvent(new Event(PRO_EVENT));
    } catch (err) {
      console.warn('[OrbitBoard] Failed to save pro session', err);
    }
    syncProState();
  }, [syncProState]);

  const getUsage = useCallback((toolSlug) => {
    if (!toolSlug) return 0;
    return Number(usageMap[toolSlug] || 0);
  }, [usageMap]);

  const recordUsage = useCallback((toolSlug) => {
    if (!toolSlug) return 1;
    const current = readUsageMap();
    const nextCount = Number(current[toolSlug] || 0) + 1;
    const updated = { ...current, [toolSlug]: nextCount };
    try {
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated));
      setUsageMap(updated);
    } catch (err) {
      console.warn('[OrbitBoard] Failed to record usage', err);
    }
    return nextCount;
  }, []);

  const canExecute = useCallback((toolSlug) => {
    if (proState.isPro) return true;
    if (!toolSlug) return true;
    return getUsage(toolSlug) < 1;
  }, [proState.isPro, getUsage]);

  const openProModal = useCallback(({ toolSlug = '', toolName = '', actionName = '', onUnlock = null } = {}) => {
    setProModal({
      isOpen: true,
      toolSlug,
      toolName,
      actionName,
      onUnlock,
    });
  }, []);

  const closeProModal = useCallback(() => {
    setProModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const executeWithProGate = useCallback((toolSlug, actionCallback, meta = {}) => {
    if (canExecute(toolSlug)) {
      recordUsage(toolSlug);
      if (typeof actionCallback === 'function') {
        actionCallback();
      }
      return true;
    }

    openProModal({
      toolSlug,
      toolName: meta.toolName || 'this tool',
      actionName: meta.actionName || 'Use this tool',
      onUnlock: () => {
        recordUsage(toolSlug);
        if (typeof actionCallback === 'function') {
          actionCallback();
        }
      },
    });
    return false;
  }, [canExecute, recordUsage, openProModal]);

  const value = useMemo(() => ({
    isPro: proState.isPro,
    daysRemaining: proState.daysRemaining,
    session: proState.session,
    getUsage,
    canExecute,
    recordUsage,
    activatePro,
    proModal,
    openProModal,
    closeProModal,
    executeWithProGate,
  }), [
    proState.isPro,
    proState.daysRemaining,
    proState.session,
    getUsage,
    canExecute,
    recordUsage,
    activatePro,
    proModal,
    openProModal,
    closeProModal,
    executeWithProGate,
  ]);

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePro() {
  const ctx = useContext(ProContext);
  if (!ctx) {
    throw new Error('usePro must be used within a ProProvider');
  }
  return ctx;
}
