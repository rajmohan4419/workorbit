import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import {
  getConsentStatus,
  setConsentStatus,
  OPEN_COOKIE_MODAL_EVENT,
  COOKIE_CONSENT_EVENT,
} from '../lib/cookieConsent';

export function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentConsent, setCurrentConsent] = useState(() => getConsentStatus());

  useEffect(() => {
    let timer;
    if (!currentConsent) {
      timer = setTimeout(() => setIsOpen(true), 600);
    }

    const handleOpen = () => setIsOpen(true);
    const handleConsentChanged = (e) => {
      if (e.detail?.status) {
        setCurrentConsent(e.detail.status);
      }
    };

    window.addEventListener(OPEN_COOKIE_MODAL_EVENT, handleOpen);
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChanged);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(OPEN_COOKIE_MODAL_EVENT, handleOpen);
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChanged);
    };
  }, [currentConsent]);

  if (!isOpen) return null;

  const handleAcceptAll = () => {
    setConsentStatus('granted');
    setIsOpen(false);
  };

  const handleEssentialOnly = () => {
    setConsentStatus('essential');
    setIsOpen(false);
  };

  const handleClose = () => {
    // If user already chose previously and just reopened the modal, allow closing without re-prompting
    if (currentConsent) {
      setIsOpen(false);
    } else {
      // Default to essential only if dismissed with X on first time
      handleEssentialOnly();
    }
  };

  return (
    <aside
      aria-label="Cookie & Privacy Preferences"
      role="region"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[95]
                 bg-white dark:bg-stone-900 border border-[var(--orbit-border)]
                 rounded-2xl shadow-2xl p-4 sm:p-5 text-stone-800 dark:text-stone-100
                 transition-all animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight text-stone-900 dark:text-stone-100">
              Cookie & Privacy Notice
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> Client-side first processing
            </span>
          </div>
        </div>

        {currentConsent && (
          <button
            onClick={handleClose}
            aria-label="Close cookie notice"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-stone-600 dark:text-stone-300">
        OrbitBoard uses cookies and local storage to measure site traffic and support our free utilities with unobtrusive Google AdSense. Your files, calculations, and data are processed locally and never uploaded to our servers.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--orbit-border)]">
        <Link
          to="/privacy"
          onClick={() => setIsOpen(false)}
          className="text-xs font-semibold text-accent-700 dark:text-accent-400 hover:underline"
        >
          Privacy Policy
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEssentialOnly}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--orbit-border)]
                       bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700
                       text-stone-700 dark:text-stone-200 transition-colors"
          >
            Essential Only
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl
                       bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}

export default CookieConsentBanner;

