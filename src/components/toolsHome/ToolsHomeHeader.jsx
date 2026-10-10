import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

export function ToolsHomeHeader({ visitorCount }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" aria-label="OrbitBoard home" className="text-xl font-black tracking-tight text-white">
          ORBIT<span className="text-violet-400">BOARD</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/market-lab" className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:border-violet-500/60 hover:text-white">
            <FlaskConical size={13} /> Market Lab
          </Link>
          {visitorCount !== null && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-500" title="Unique visitors recorded by OrbitBoard">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              {visitorCount.toLocaleString()} visitors
            </div>
          )}
          <div className="text-xs font-medium text-slate-500">Free • No sign-up</div>
        </div>
      </div>
    </header>
  );
}
