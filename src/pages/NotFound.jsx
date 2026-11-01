import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, ArrowRight, Home } from 'lucide-react';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';

export default function NotFound() {
  useEffect(() => {
    document.title = '404 — Page Not Found | OrbitBoard';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, follow';
  }, []);

  return (
    <div className="orbit-light min-h-screen bg-[var(--orbit-canvas)] text-stone-900 flex flex-col justify-between">
      <div>
        <ToolsHomeHeader />
        <main className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 mb-6 font-mono text-2xl font-black">
            404
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-stone-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-base sm:text-lg text-stone-600 max-w-xl mx-auto mb-8 leading-relaxed">
            The page or tool you are looking for doesn't exist, may have been retired, or is currently under development.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/tools"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <Calculator size={18} />
              Browse Free Tools
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--orbit-border)] bg-white hover:bg-stone-50 text-stone-800 font-semibold text-sm transition-colors shadow-sm"
            >
              <Home size={18} />
              Homepage
            </Link>
          </div>
        </main>
      </div>
      <ToolsHomeFooter />
    </div>
  );
}
