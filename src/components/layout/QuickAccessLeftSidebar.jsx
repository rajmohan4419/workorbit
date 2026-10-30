import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap, Star, Search, X, ChevronLeft, ChevronRight,
  LayoutGrid, RotateCcw, Coins, BriefcaseBusiness, Code2, Calculator,
  TrendingUp, Info, Mail, Heart, ShieldCheck, FileText, Sun, Moon,
  ChevronDown, ExternalLink
} from 'lucide-react';
import { LISTED_TOOLS } from '../../data/toolCatalog';
import { preloadToolPage } from '../../lib/toolPageLoader';
import { OrbitBoardIcon } from '../brand/OrbitBoardIcon';

const TOP_FEATURED_SLUGS = [
  'gst-invoice-generator',
  'ctc-to-inhand',
  'image-compressor',
  'image-to-gif',
  'video-to-gif',
  'pdf-merge',
  'pdf-workspace',
  'emi',
  'json-formatter',
  'percentage',
  'notice-period'
];

const CATEGORIES = [
  { name: 'Finance', label: 'Finance & Money', icon: Coins },
  { name: 'Career', label: 'Career & Salary', icon: BriefcaseBusiness },
  { name: 'Developer', label: 'Developer Tools', icon: Code2 },
  { name: 'Everyday', label: 'Everyday Utilities', icon: Calculator },
  { name: 'Business', label: 'Business & SaaS', icon: TrendingUp },
];

/** A small colored badge showing the tool's icon or first letter */
function ToolAvatar({ tool, size = 'md' }) {
  const colors = [
    'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
  ];
  const colorIdx = (tool.name.charCodeAt(0) || 0) % colors.length;
  const label = tool.icon && tool.icon.length <= 3 ? tool.icon : tool.name[0]?.toUpperCase();
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs';

  return (
    <span
      className={`shrink-0 flex items-center justify-center rounded-lg font-bold ${sizeClass} ${colors[colorIdx]}`}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

export function QuickAccessLeftSidebar() {
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('orbitboard:sidebar-collapsed') || 'false');
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [pinnedSlugs, setPinnedSlugs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('orbitboard:quickaccess') || 'null');
      return saved || TOP_FEATURED_SLUGS;
    } catch {
      return TOP_FEATURED_SLUGS;
    }
  });

  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('orbitboard:theme') === 'dark' || document.documentElement.classList.contains('dark');
    } catch {
      return false;
    }
  });

  const searchInputRef = useRef(null);

  // Sync dark theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('orbitboard:theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('orbitboard:theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('orbitboard:sidebar-collapsed', JSON.stringify(collapsed));
    } catch { void 0; }
  }, [collapsed]);

  // Persist pinned slugs
  useEffect(() => {
    try {
      localStorage.setItem('orbitboard:quickaccess', JSON.stringify(pinnedSlugs));
    } catch { void 0; }
  }, [pinnedSlugs]);

  // Listen for mobile sidebar events from header or other components
  useEffect(() => {
    const handleOpen = () => setMobileOpen(true);
    const handleClose = () => setMobileOpen(false);
    const handleToggle = () => setMobileOpen(prev => !prev);

    window.addEventListener('orbitboard:open-mobile-sidebar', handleOpen);
    window.addEventListener('orbitboard:close-mobile-sidebar', handleClose);
    window.addEventListener('orbitboard:toggle-mobile-sidebar', handleToggle);

    return () => {
      window.removeEventListener('orbitboard:open-mobile-sidebar', handleOpen);
      window.removeEventListener('orbitboard:close-mobile-sidebar', handleClose);
      window.removeEventListener('orbitboard:toggle-mobile-sidebar', handleToggle);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const togglePin = (slug) => {
    setPinnedSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const featuredTools = useMemo(() => {
    return pinnedSlugs
      .map(slug => LISTED_TOOLS.find(t => t.slug === slug))
      .filter(Boolean);
  }, [pinnedSlugs]);

  const filteredTools = useMemo(() => {
    if (!search.trim()) return featuredTools;
    const q = search.trim().toLowerCase();
    return LISTED_TOOLS.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q)
    ).slice(0, 16);
  }, [search, featuredTools]);

  const currentToolSlug = location.pathname.startsWith('/tools/')
    ? location.pathname.split('/tools/')[1]?.split('/')[0]
    : null;

  const currentCategory = new URLSearchParams(location.search).get('category');

  // Shared content for expanded view (used by desktop expanded & mobile drawer)
  const renderExpandedContent = (isMobile = false) => (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header (shrink-0) */}
      <div className="flex items-center justify-between gap-2.5 h-14 px-4 border-b border-[var(--orbit-border)] bg-[var(--orbit-surface)] shrink-0">
        <Link to="/" className="flex items-center gap-2.5 min-w-0 group" aria-label="OrbitBoard Home">
          <OrbitBoardIcon size={26} className="transition-transform group-hover:scale-105 shrink-0" />
          <span className="text-base font-black tracking-tight text-stone-900 dark:text-stone-100 truncate">
            Orbit<span className="bg-gradient-to-r from-sky-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">Board</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <span className="rounded-full bg-accent-100 dark:bg-accent-950/70 px-2 py-0.5 text-[10px] font-bold text-accent-800 dark:text-accent-300">
            {LISTED_TOOLS.length} Tools
          </span>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Tool Filter Input (shrink-0) */}
      <div className="px-3 py-2 border-b border-[var(--orbit-border)] shrink-0 bg-[var(--orbit-surface)]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search all 57 tools…"
            className="w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-850 py-1.5 pl-8 pr-7 text-xs text-stone-900 dark:text-stone-100 outline-none transition placeholder:text-stone-400 focus:border-accent-500 focus:bg-white dark:focus:bg-stone-800 focus:ring-1 focus:ring-accent-400/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label="Clear filter"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Navigation & Categories (shrink-0) */}
      <div className="px-2 py-2 border-b border-[var(--orbit-border)] space-y-0.5 shrink-0 bg-[var(--orbit-surface)]">
        <Link
          to="/tools"
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            location.pathname === '/tools' && !currentCategory
              ? 'bg-accent-100 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300'
              : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <LayoutGrid size={15} className="text-accent-600 dark:text-accent-400" />
          <span className="flex-1 truncate">All Tools Catalogue</span>
        </Link>

        {/* Categories accordion header */}
        <button
          type="button"
          onClick={() => setCategoriesOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        >
          <span>Categories</span>
          <ChevronDown size={12} className={`transition-transform duration-150 ${categoriesOpen ? '' : '-rotate-90'}`} />
        </button>

        {categoriesOpen && (
          <div className="space-y-0.5 pl-1">
            {CATEGORIES.map(({ name, label, icon: CatIcon }) => {
              const isActive = (location.pathname === '/tools' || location.pathname === '/') && currentCategory === name;
              return (
                <Link
                  key={name}
                  to={`/tools?category=${name}`}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <CatIcon size={14} className={isActive ? 'text-accent-600 dark:text-accent-400' : 'text-stone-400'} />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Starred Shortcuts (flex-1 min-h-0 with SCROLLBAR) */}
      <div className="flex-1 min-h-0 overflow-y-auto orbit-scrollbar px-2 py-2 space-y-0.5">
        <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Star size={11} className="fill-amber-400 text-amber-500" />
            <span>{search.trim() ? `Search Results (${filteredTools.length})` : `Starred Tools (${pinnedSlugs.length})`}</span>
          </span>
          {!search.trim() && (
            <button
              type="button"
              onClick={() => setPinnedSlugs(TOP_FEATURED_SLUGS)}
              title="Reset to default pinned tools"
              className="text-[10px] font-semibold text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {filteredTools.map(tool => {
          const isActive = currentToolSlug === tool.slug;
          const isPinned = pinnedSlugs.includes(tool.slug);
          return (
            <div
              key={tool.slug}
              onMouseEnter={() => preloadToolPage(tool.slug)}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors cursor-default ${
                isActive
                  ? 'bg-accent-50 dark:bg-accent-950/50 text-accent-700 dark:text-accent-300 ring-1 ring-accent-400/30'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <Link
                to={`/tools/${tool.slug}`}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <ToolAvatar tool={tool} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className={`block truncate text-xs font-semibold leading-tight ${
                    isActive
                      ? 'text-accent-700 dark:text-accent-300'
                      : 'text-stone-800 dark:text-stone-100'
                  }`}>
                    {tool.name}
                  </span>
                  <span className="block truncate text-[10px] text-stone-400 dark:text-stone-500 leading-tight mt-0.5">
                    {tool.category}
                  </span>
                </span>
              </Link>

              {/* Star toggle button */}
              <button
                type="button"
                onClick={() => togglePin(tool.slug)}
                aria-label={isPinned ? `Unpin ${tool.name}` : `Pin ${tool.name}`}
                title={isPinned ? 'Remove from starred' : 'Add to starred'}
                className={`shrink-0 flex items-center justify-center h-6 w-6 rounded-lg transition-all ${
                  isPinned
                    ? 'text-amber-500 opacity-80 group-hover:opacity-100 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    : 'text-stone-300 dark:text-stone-600 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <Star size={12} fill={isPinned ? 'currentColor' : 'none'} />
              </button>
            </div>
          );
        })}

        {filteredTools.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-stone-400 dark:text-stone-500">
            {search.trim() ? `No tools match "${search}"` : 'No starred tools. Star tools to add them here!'}
          </div>
        )}
      </div>

      {/* 5. General Pages Links (shrink-0) */}
      <div className="border-t border-[var(--orbit-border)] px-2 py-2 shrink-0 bg-[var(--orbit-surface)] space-y-0.5 text-xs">
        <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-600 dark:text-stone-400">
          <Link to="/about" className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 truncate">
            <Info size={12} className="text-blue-500 shrink-0" />
            <span className="truncate">About</span>
          </Link>
          <Link to="/contact" className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 truncate">
            <Mail size={12} className="text-rose-500 shrink-0" />
            <span className="truncate">Contact</span>
          </Link>
          <a href="/#support" className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 truncate">
            <Heart size={12} className="text-violet-500 shrink-0" />
            <span className="truncate">Support</span>
          </a>
          <Link to="/privacy" className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 truncate">
            <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
            <span className="truncate">Privacy</span>
          </Link>
        </div>
      </div>

      {/* 6. Footer: Theme Toggle & ALWAYS VISIBLE Collapse Button (shrink-0) */}
      <div className="border-t border-[var(--orbit-border)] px-3 py-2.5 flex items-center justify-between shrink-0 bg-[var(--orbit-surface)]">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
        >
          {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-stone-600" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Collapse Button (Desktop Only) */}
        {!isMobile && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <ChevronLeft size={14} />
            <span>Collapse</span>
          </button>
        )}
      </div>
    </div>
  );

  // ── Collapsed (icon rail) ────────────────────────────────────────────
  const renderCollapsedContent = () => (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Branding icon */}
      <div className="flex items-center justify-center h-14 border-b border-[var(--orbit-border)] shrink-0">
        <Link to="/" aria-label="OrbitBoard Home" className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition">
          <OrbitBoardIcon size={24} />
        </Link>
      </div>

      {/* Top icon shortcuts */}
      <div className="px-2 py-2 border-b border-[var(--orbit-border)] space-y-1.5 shrink-0 flex flex-col items-center">
        {/* All tools */}
        <Link
          to="/tools"
          title="All Tools Catalogue"
          className={`group relative flex items-center justify-center h-9 w-9 rounded-xl transition ${
            location.pathname === '/tools'
              ? 'bg-accent-100 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
          }`}
          aria-label="All Tools Catalogue"
        >
          <LayoutGrid size={18} />
          <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-stone-900 dark:bg-stone-700 px-2.5 py-1 text-xs font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            All Tools Catalogue
          </span>
        </Link>

        {/* Filter expand button */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Search tools"
          className="group relative flex items-center justify-center h-9 w-9 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition"
          aria-label="Search tools"
        >
          <Search size={16} />
          <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-stone-900 dark:bg-stone-700 px-2.5 py-1 text-xs font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            Search tools
          </span>
        </button>
      </div>

      {/* Pinned tool icons with custom scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto orbit-scrollbar py-2 flex flex-col items-center gap-1.5">
        {featuredTools.map(tool => {
          const isActive = currentToolSlug === tool.slug;
          return (
            <Link
              key={tool.slug}
              to={`/tools/${tool.slug}`}
              onMouseEnter={() => preloadToolPage(tool.slug)}
              title={tool.name}
              className={`group relative flex items-center justify-center h-9 w-9 rounded-xl transition-colors ${
                isActive
                  ? 'bg-accent-100 dark:bg-accent-950/60 ring-1 ring-accent-400/50'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              aria-label={tool.name}
            >
              <ToolAvatar tool={tool} size="sm" />
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-stone-900 dark:bg-stone-700 px-2.5 py-1 text-xs font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                {tool.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer: Theme Toggle & ALWAYS VISIBLE Expand Button */}
      <div className="border-t border-[var(--orbit-border)] py-2.5 flex flex-col items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="group relative flex items-center justify-center h-9 w-9 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-stone-900 dark:bg-stone-700 px-2.5 py-1 text-xs font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="flex items-center justify-center h-9 w-9 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Fixed / Sticky Sidebar ── */}
      <aside
        className={`hidden sm:flex flex-col shrink-0 sticky top-0 h-screen bg-[var(--orbit-surface)] border-r border-[var(--orbit-border)] transition-[width] duration-200 ease-in-out z-30 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
        aria-label="Quick Access Sidebar"
      >
        {collapsed ? renderCollapsedContent() : renderExpandedContent(false)}
      </aside>

      {/* ── Mobile Slide-Over Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation Sidebar">
          {/* Dimmed backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside className="relative w-72 max-w-[85vw] h-full bg-[var(--orbit-surface)] border-r border-[var(--orbit-border)] shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {renderExpandedContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}

export default QuickAccessLeftSidebar;
