import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const DISMISSED_KEY = 'orbitboard:pwa-dismissed';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [ios] = useState(() => typeof navigator !== 'undefined' && isIOS());

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (ios) {
      // Show iOS-specific guidance after a short delay
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [ios]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    } else {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div
      role="banner"
      aria-label="Install OrbitBoard"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md
                 bg-[var(--orbit-surface,#fff)] border border-[var(--orbit-border,#e5e7eb)]
                 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3"
    >
      <span className="text-2xl select-none" aria-hidden="true">
        <Smartphone className="w-6 h-6 text-indigo-600 shrink-0" />
      </span>

      <p className="flex-1 text-sm text-stone-700 leading-snug">
        {ios ? (
          <>
            <strong>iPhone:</strong> tap the Share button, then{' '}
            <em>Add to Home Screen</em> for instant access to OrbitBoard.
          </>
        ) : (
          <>
            <strong>📱 Add OrbitBoard</strong> to your home screen for instant
            access — free, no sign-up!
          </>
        )}
      </p>

      <div className="flex items-center gap-2 shrink-0">
        {!ios && (
          <button
            onClick={handleInstall}
            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700
                       text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
