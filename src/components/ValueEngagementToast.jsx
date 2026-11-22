import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, X, Sparkles, ArrowRight } from 'lucide-react';
import { useAccountSession } from '../lib/monetization/useAccountSession';

const MILESTONE_COUNT = 3;
const COOLDOWN_DAYS = 14;

export function ValueEngagementToast() {
  const location = useLocation();
  const { session } = useAccountSession();
  const [visible, setVisible] = useState(false);
  const [kind, setKind] = useState('milestone'); // 'milestone' (sign-up/track) | 'support' (coffee)

  useEffect(() => {
    // Only trigger on tool pages or after engaging with tools
    if (!location.pathname.startsWith('/tools/')) return;

    // Check if dismissed recently
    try {
      const dismissedUntil = localStorage.getItem('orbitboard:toast-dismissed-until');
      if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
        return;
      }

      // Increment tool interaction count
      const count = Number(localStorage.getItem('orbitboard:tool-views-count') || 0) + 1;
      localStorage.setItem('orbitboard:tool-views-count', String(count));

      // Trigger after user has used/viewed at least 3 tools
      if (count >= MILESTONE_COUNT) {
        const isSigned = Boolean(session && !session.user?.is_anonymous);
        const targetKind = isSigned ? 'support' : (count % 2 === 0 ? 'support' : 'milestone');

        // Brief delay so it appears gently after the page is usable
        const timer = setTimeout(() => {
          setKind(targetKind);
          setVisible(true);
        }, 1800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage errors (private mode)
    }
  }, [location.pathname, session]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      // Cooldown for 14 days
      const expire = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem('orbitboard:toast-dismissed-until', String(expire));
    } catch {
      // Ignore
    }
  };

  if (!visible) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
          {kind === 'support' ? <Heart size={18} className="fill-current text-rose-500" /> : <Sparkles size={18} />}
        </div>

        <div className="min-w-0 flex-1 text-left">
          {kind === 'support' ? (
            <>
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Finding OrbitBoard useful?
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                These tools are free and run privately in your browser. Help us keep them ad-light and running.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <a
                  href="/#support"
                  onClick={handleDismiss}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
                >
                  Support project (₹50)
                  <ArrowRight size={12} />
                </a>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg px-2 py-1 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  Maybe later
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Save your progress & downloads
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                Sign up free with an email OTP to enable PDF/XLSX export downloads and access past sessions.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <Link
                  to="/account"
                  onClick={handleDismiss}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
                >
                  Sign up free
                  <ArrowRight size={12} />
                </Link>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg px-2 py-1 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  Keep browsing
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="shrink-0 rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
}
