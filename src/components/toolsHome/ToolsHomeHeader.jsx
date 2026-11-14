import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Sparkles, ShieldCheck, Users } from 'lucide-react';
import { OrbitBoardIcon } from '../brand/OrbitBoardIcon';

export function ToolsHomeHeader({ visitorCount }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      <header
        className={`sticky top-0 z-20 border-b transition-all duration-300 ease-[var(--ease-out-expo)] ${
          isScrolled
            ? 'border-[var(--orbit-border)]/90 bg-[var(--orbit-canvas)]/85 backdrop-blur-md shadow-xs'
            : 'border-[var(--orbit-border)]/60 bg-[var(--orbit-canvas)]/95 backdrop-blur-sm'
        }`}
      >
        <div
          className={`w-full max-w-[1440px] mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300 ease-[var(--ease-out-expo)] ${
            isScrolled ? 'h-12 sm:h-14' : 'h-14 sm:h-16'
          }`}
        >
          {/* Brand & Mobile Hamburger (Left) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Hamburger toggle to open Sidebar */}
            <button
              type="button"
              onClick={openMobileSidebar}
              aria-label="Open sidebar menu"
              className="sm:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 min-h-[40px] min-w-[40px] flex items-center justify-center border border-[var(--orbit-border)] transition active:scale-95"
            >
              <Menu size={20} />
            </button>

            {/* Logo */}
            <Link
              to="/"
              aria-label="OrbitBoard home"
              className="text-lg sm:text-xl font-black tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2 sm:gap-2.5 shrink-0 group"
            >
              <OrbitBoardIcon size={28} className="sm:w-8 sm:h-8 brand-icon-orbit" />
              <span className="tracking-tight">
                Orbit<span className="bg-gradient-to-r from-sky-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">Board</span>
              </span>
            </Link>
          </div>

          {/* Announcements & Status Bar (Center & Right) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              to="/account"
              className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold text-stone-700 dark:text-stone-200 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-transparent hover:border-[var(--orbit-border)] transition shrink-0"
            >
              Sign up / Account
            </Link>

            {/* Primary Announcement Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-accent-200/80 dark:border-accent-800/80 bg-accent-50/70 dark:bg-accent-950/40 px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-accent-800 dark:text-accent-300 shadow-2xs truncate">
              <Sparkles size={13} className="shrink-0 text-accent-600 dark:text-accent-400" />
              <span className="truncate">
                <span className="hidden sm:inline font-bold">Announcement: </span>
                <span>Free tools · Sign up for PDF/XLSX downloads</span>
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
                <span>Browser-based file processing</span>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default ToolsHomeHeader;
