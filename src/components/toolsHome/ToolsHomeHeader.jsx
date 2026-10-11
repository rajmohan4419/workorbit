import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

export function ToolsHomeHeader({ visitorCount }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--orbit-border)] bg-[var(--orbit-canvas)]/95 backdrop-blur">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/" aria-label="OrbitBoard home" className="text-xl font-black tracking-tight text-stone-900">
          ORBIT<span className="text-[var(--orbit-accent)]">BOARD</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/market-lab" className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--orbit-accent)] px-3 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-accent)]">
            <FlaskConical size={15} /> Market Lab
          </Link>
          {visitorCount !== null && <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-[var(--orbit-border)] bg-white px-3 py-1.5 text-[11px] font-medium text-stone-600" title="Unique visitors recorded by OrbitBoard"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />{visitorCount.toLocaleString()} visitors</div>}
          <div className="hidden sm:block text-xs font-medium text-stone-500">Free • No sign-up</div>
        </div>
      </div>
    </header>
  );
}
