import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

export function ToolsHomeHeader({ visitorCount }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e7dfd3] bg-[#fbf8f3]/95 backdrop-blur">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" aria-label="OrbitBoard home" className="text-xl font-black tracking-tight text-stone-900">
          ORBIT<span className="text-violet-600">BOARD</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/market-lab" className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-100">
            <FlaskConical size={13} /> Market Lab
          </Link>
          {visitorCount !== null && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#e7dfd3] bg-white px-3 py-1.5 text-[11px] font-medium text-stone-600" title="Unique visitors recorded by OrbitBoard">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {visitorCount.toLocaleString()} visitors
            </div>
          )}
          <div className="text-xs font-medium text-stone-500">Free • No sign-up</div>
        </div>
      </div>
    </header>
  );
}
