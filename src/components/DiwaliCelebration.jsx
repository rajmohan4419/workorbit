import { useState } from 'react';

const STORAGE_KEY = 'orbitboard-diwali-2026-dismissed';

export function DiwaliCelebration() {
  const [visible, setVisible] = useState(() => {
    // Seasonal greeting is initialized once, without a cascading effect render.
    const now = new Date();
    const inSeason = now.getFullYear() === 2026 && now.getMonth() === 10 &&
      now.getDate() >= 1 && now.getDate() <= 15;
    if (!inSeason || typeof window === 'undefined') return false;
    try { return window.sessionStorage.getItem(STORAGE_KEY) !== 'true'; }
    catch { return true; }
  });

  if (!visible) return null;

  const dismiss = () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  return (
    <aside className="ob-diwali" aria-label="Diwali greetings">
      <style>{`
        .ob-diwali { position: fixed; bottom: 18px; right: 18px; z-index: 1000; width: min(340px, calc(100vw - 32px)); pointer-events: none; }
        .ob-diwali-card { position: relative; overflow: hidden; isolation: isolate; pointer-events: auto; padding: 20px 28px 18px; border: 1px solid rgba(255,191,94,.55); border-radius: 20px; background: linear-gradient(135deg,#321254 0%,#6c2379 55%,#a8424d 100%); color: #fff9e9; text-align: center; box-shadow: 0 14px 42px rgba(42,15,73,.25); animation: ob-diwali-enter .55s ease-out both; }
        .ob-diwali-close { position: absolute; right: 9px; top: 8px; border: 0; border-radius: 50%; background: rgba(255,255,255,.14); color: white; width: 30px; height: 30px; cursor: pointer; font-size: 21px; line-height: 1; }
        .ob-diwali-close:focus-visible { outline: 2px solid #ffdc88; outline-offset: 2px; }
        .ob-diwali-lamps { font-size: 29px; letter-spacing: 16px; padding-left: 16px; filter: drop-shadow(0 0 9px #ffbe54); animation: ob-diwali-glow 2.6s ease-in-out infinite alternate; }
        .ob-diwali-title { margin: 9px 0 3px; font-size: 26px; font-weight: 800; letter-spacing: .4px; line-height: 1.2; color: #ffe5a0; }
        .ob-diwali-subtitle { margin: 7px 0 0; font-size: 13px; line-height: 1.5; color: #fff2dc; }
        .ob-diwali-spark { position: absolute; z-index: -1; width: 5px; height: 5px; border-radius: 50%; background: #ffe6a0; box-shadow: 0 0 12px 3px #ffc55e; animation: ob-diwali-sparkle 2.7s ease-in-out infinite; }
        .ob-diwali-spark:nth-of-type(1) { top: 20%; left: 10%; }
        .ob-diwali-spark:nth-of-type(2) { top: 60%; right: 12%; animation-delay: .8s; }
        .ob-diwali-spark:nth-of-type(3) { bottom: 12%; left: 24%; animation-delay: 1.5s; }
        .ob-diwali-spark:nth-of-type(4) { top: 14%; right: 24%; animation-delay: 2s; }
        @keyframes ob-diwali-enter { from { opacity: 0; transform: translateY(22px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes ob-diwali-glow { from { filter: drop-shadow(0 0 3px #ffbe54); transform: translateY(1px); } to { filter: drop-shadow(0 0 13px #ffd178); transform: translateY(-2px); } }
        @keyframes ob-diwali-sparkle { 0%,100% { opacity: .15; transform: scale(.5); } 50% { opacity: 1; transform: scale(1.7); } }
        @media (max-width: 480px) { .ob-diwali { right: 12px; bottom: 12px; width: min(310px, calc(100vw - 24px)); } .ob-diwali-card { padding: 15px 23px 14px; } .ob-diwali-title { font-size: 23px; } }
        @media (prefers-reduced-motion: reduce) { .ob-diwali-card, .ob-diwali-lamps, .ob-diwali-spark { animation: none !important; } }
      `}</style>
      <div className="ob-diwali-card">
        <button className="ob-diwali-close" type="button" onClick={dismiss} aria-label="Dismiss Diwali greeting">×</button>
        <span className="ob-diwali-spark" aria-hidden="true" />
        <span className="ob-diwali-spark" aria-hidden="true" />
        <span className="ob-diwali-spark" aria-hidden="true" />
        <span className="ob-diwali-spark" aria-hidden="true" />
        <div className="ob-diwali-lamps" aria-hidden="true">🪔 🪔 🪔</div>
        <h2 className="ob-diwali-title">Happy Diwali!</h2>
        <p className="ob-diwali-subtitle">May your celebrations shine with joy, prosperity and new possibilities. ✨</p>
      </div>
    </aside>
  );
}
