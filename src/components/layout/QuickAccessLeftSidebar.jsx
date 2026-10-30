import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap, Star, Search, X, ChevronLeft, ChevronRight,
  LayoutGrid, RotateCcw
} from 'lucide-react';
import { LISTED_TOOLS } from '../../data/toolCatalog';
import { preloadToolPage } from '../../lib/toolPageLoader';

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

/** A small colored circle showing the tool's icon emoji or first letter */
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
  const sizeClass = size === 'sm'
    ? 'h-7 w-7 text-[11px]'
    : 'h-8 w-8 text-xs';

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

  const [search, setSearch] = useState('');
  const [pinnedSlugs, setPinnedSlugs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('orbitboard:quickaccess') || 'null');
      return saved || TOP_FEATURED_SLUGS;
    } catch {
      return TOP_FEATURED_SLUGS;
    }
  });

  const searchInputRef = useRef(null);

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
    ).slice(0, 12);
  }, [search, featuredTools]);

  const currentToolSlug = location.pathname.startsWith('/tools/')
    ? location.pathname.split('/tools/')[1]?.split('/')[0]
    : null;

  // ── Collapsed (icon rail) ────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside
        className="hidden sm:flex flex-col shrink-0 w-[60px] bg-[var(--orbit-surface)] border-r border-[var(--orbit-border)] transition-all duration-200 ease-in-out z-20 relative"
        aria-label="Quick Access Sidebar (collapsed)"
      >
        {/* Branding icon */}
        <div className="flex items-center justify-center h-14 border-b border-[var(--orbit-border)]">
          <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500">
            <Zap size={18} className="fill-amber-400 text-amber-500" />
          </span>
        </div>

        {/* Pinned tool icons */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 flex flex-col items-center gap-1">
          {featuredTools.map(tool => {
            const isActive = currentToolSlug === tool.slug;
            return (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}`}
                onMouseEnter={() => preloadToolPage(tool.slug)}
                title={tool.name}
                className={`group relative flex items-center justify-center h-10 w-10 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-accent-100 dark:bg-accent-950/40 ring-1 ring-accent-400/40'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
                aria-label={tool.name}
              >
                <ToolAvatar tool={tool} size="sm" />
                {/* Tooltip */}
                <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-stone-900 dark:bg-stone-700 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {tool.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Expand toggle */}
        <div className="border-t border-[var(--orbit-border)] flex items-center justify-center py-3">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="flex items-center justify-center h-9 w-9 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </aside>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────────
  return (
    <aside
      className="hidden sm:flex flex-col shrink-0 w-60 bg-[var(--orbit-surface)] border-r border-[var(--orbit-border)] transition-all duration-200 ease-in-out z-20 relative"
      aria-label="Quick Access Sidebar"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-[var(--orbit-border)]">
        <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 shrink-0">
          <Zap size={16} className="fill-amber-400 text-amber-500" />
        </span>
        <span className="text-sm font-bold text-stone-800 dark:text-stone-100 tracking-tight truncate">
          Quick Access
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
          {pinnedSlugs.length}
        </span>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-[var(--orbit-border)]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter tools…"
            className="w-full rounded-lg border border-[var(--orbit-border)] bg-white dark:bg-stone-800 py-1.5 pl-8 pr-7 text-xs text-stone-900 dark:text-stone-100 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-300/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tool list */}
      <div className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5">
        {search.trim() && (
          <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {filteredTools.length > 0 ? `Results (${filteredTools.length})` : 'No results'}
          </p>
        )}
        {!search.trim() && (
          <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pinned Shortcuts
          </p>
        )}

        {filteredTools.map(tool => {
          const isActive = currentToolSlug === tool.slug;
          const isPinned = pinnedSlugs.includes(tool.slug);
          return (
            <div
              key={tool.slug}
              onMouseEnter={() => preloadToolPage(tool.slug)}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors cursor-default ${
                isActive
                  ? 'bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400'
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

              {/* Star / unpin button */}
              <button
                type="button"
                onClick={() => togglePin(tool.slug)}
                aria-label={isPinned ? `Unpin ${tool.name}` : `Pin ${tool.name}`}
                title={isPinned ? 'Unpin' : 'Pin to Quick Access'}
                className={`shrink-0 flex items-center justify-center h-6 w-6 rounded-lg transition-all ${
                  isPinned
                    ? 'text-amber-500 opacity-0 group-hover:opacity-100 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    : 'text-stone-300 dark:text-stone-600 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <Star size={13} fill={isPinned ? 'currentColor' : 'none'} />
              </button>
            </div>
          );
        })}

        {filteredTools.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-stone-400 dark:text-stone-500">
            {search.trim() ? `No tools match "${search}"` : 'No pinned tools'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--orbit-border)] px-3 py-2.5 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => setPinnedSlugs(TOP_FEATURED_SLUGS)}
          title="Reset to default pins"
          className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>

        <Link
          to="/tools"
          className="flex items-center gap-1 text-[11px] font-semibold text-accent-600 dark:text-accent-400 hover:underline"
        >
          <LayoutGrid size={11} />
          <span>All Tools</span>
        </Link>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-[var(--orbit-border)] flex items-center justify-end pr-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 px-2 py-1.5 rounded-lg transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Collapse</span>
        </button>
      </div>
    </aside>
  );
}

export default QuickAccessLeftSidebar;
