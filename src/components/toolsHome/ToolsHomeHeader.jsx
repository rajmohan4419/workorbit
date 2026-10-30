import { Link } from 'react-router-dom';
import { Menu, Sparkles, ShieldCheck, Users } from 'lucide-react';
import { OrbitBoardIcon } from '../brand/OrbitBoardIcon';

export function ToolsHomeHeader({ visitorCount }) {
  const openMobileSidebar = () => {
    window.dispatchEvent(new CustomEvent('orbitboard:open-mobile-sidebar'));
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-accent-600 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold shadow-lg"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-[var(--orbit-border)] bg-[var(--orbit-canvas)]/95 backdrop-blur transition-colors">
        <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand & Mobile Hamburger (Left) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Hamburger toggle to open Sidebar */}
            <button
              type="button"
              onClick={openMobileSidebar}
              aria-label="Open sidebar menu"
              className="sm:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 min-h-[40px] min-w-[40px] flex items-center justify-center border border-[var(--orbit-border)] transition"
            >
              <Menu size={20} />
            </button>

            {/* Logo */}
            <Link
              to="/"
              aria-label="OrbitBoard home"
              className="text-lg sm:text-xl font-black tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2 sm:gap-2.5 shrink-0 group"
            >
              <OrbitBoardIcon size={28} className="sm:w-8 sm:h-8 transition-transform group-hover:scale-105" />
              <span className="tracking-tight">
                Orbit<span className="bg-gradient-to-r from-sky-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">Board</span>
              </span>
            </Link>
          </div>

          {/* Announcements & Status Bar (Center & Right) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Primary Announcement Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-accent-200/80 dark:border-accent-800/80 bg-accent-50/70 dark:bg-accent-950/40 px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-accent-800 dark:text-accent-300 shadow-2xs truncate">
              <Sparkles size={13} className="shrink-0 text-accent-600 dark:text-accent-400" />
              <span className="truncate">
                <span className="hidden sm:inline font-bold">Announcement: </span>
                <span>100% Client-Side • No data leaves your device</span>
              </span>
            </div>

            {/* Live Visitor / Privacy Badge */}
            {typeof visitorCount === 'number' && Number.isFinite(visitorCount) ? (
              <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Users size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span>{visitorCount.toLocaleString()} sessions</span>
              </div>
            ) : (
              <div className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2.5 py-1 text-[11px] font-medium text-stone-600 dark:text-stone-300 shrink-0">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>Zero Server Storage</span>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default ToolsHomeHeader;
