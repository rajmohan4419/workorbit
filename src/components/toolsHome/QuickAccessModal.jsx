import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Star, X, Search, ArrowRight, Sparkles, RotateCcw } from 'lucide-react';
import { LISTED_TOOLS } from '../../data/toolCatalog';
import { preloadToolPage } from '../../lib/toolPageLoader';

// Top featured tools permanently pinned for rapid workflow
const TOP_FEATURED_SLUGS = [
  'bank-reconciliation',
  'gst-invoice-generator',
  'excel-engine',
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

export function QuickAccessSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);
  const [pinnedSlugs, setPinnedSlugs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('orbitboard:quickaccess') || 'null');
      return saved || TOP_FEATURED_SLUGS;
    } catch {
      return TOP_FEATURED_SLUGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('orbitboard:quickaccess', JSON.stringify(pinnedSlugs));
    } catch { void 0; }
  }, [pinnedSlugs]);

  // Close on Escape key & focus search input on open
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
      // auto-focus search input with a brief delay for animation
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

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
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return LISTED_TOOLS.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Quick Access Sidebar">
      {/* Dimmed backdrop with smooth fade */}
      <div 
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer / Sidebar */}
      <aside className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md sm:max-w-lg flex-col border-l border-[var(--orbit-border)] bg-[var(--orbit-canvas)] dark:bg-stone-900 shadow-2xl transition-transform duration-300 ease-out animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--orbit-border)] bg-white/70 dark:bg-stone-950/60 px-5 py-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap size={22} className="fill-amber-400 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 sm:text-lg">Quick Access</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  {pinnedSlugs.length} pinned
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Your shortcuts to frequently used utilities</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Quick Access sidebar"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* In-sidebar Search Bar */}
        <div className="border-b border-[var(--orbit-border)] bg-stone-50/70 p-4 dark:bg-stone-900/60">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search all ${LISTED_TOOLS.length} tools to launch or pin…`}
              className="w-full rounded-xl border border-[var(--orbit-border)] bg-white py-2 pl-9 pr-8 text-xs text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40 dark:bg-stone-800 dark:text-stone-100 sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Tool List */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {search.trim() ? (
            /* Search Results Mode */
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Search Results ({filteredTools.length})
              </p>
              <div className="space-y-2">
                {filteredTools.map(tool => {
                  const isPinned = pinnedSlugs.includes(tool.slug);
                  return (
                    <div
                      key={tool.slug}
                      onMouseEnter={() => preloadToolPage(tool.slug)}
                      className="group flex items-center justify-between gap-2 rounded-2xl border border-[var(--orbit-border)] bg-white p-3 shadow-2xs transition hover:border-amber-400 dark:bg-stone-800/60"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/tools/${tool.slug}`);
                        }}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="truncate text-sm font-bold text-stone-900 group-hover:text-amber-600 dark:text-stone-100 dark:group-hover:text-amber-400">
                          {tool.name}
                        </p>
                        <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                          {tool.category} • {tool.description}
                        </p>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePin(tool.slug)}
                          className={`flex min-h-[38px] items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                            isPinned
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700/60 dark:text-stone-300 dark:hover:bg-stone-700'
                          }`}
                          title={isPinned ? 'Remove from Quick Access' : 'Pin to Quick Access'}
                        >
                          <Star size={13} fill={isPinned ? 'currentColor' : 'none'} className={isPinned ? 'text-amber-500' : ''} />
                          <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate(`/tools/${tool.slug}`);
                          }}
                          aria-label={`Open ${tool.name}`}
                          className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-amber-500 text-white transition hover:bg-amber-600"
                        >
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!filteredTools.length && (
                  <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400">
                    No tools found matching &quot;{search}&quot;.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Pinned Tools List */
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Sparkles size={13} /> Pinned Shortcuts
                </span>
                <span className="text-[11px] text-stone-400">Click star to unpin</span>
              </div>

              <div className="space-y-2">
                {featuredTools.map(tool => (
                  <div
                    key={tool.slug}
                    onMouseEnter={() => preloadToolPage(tool.slug)}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--orbit-border)] bg-white p-3 shadow-2xs transition hover:border-amber-400 hover:shadow-xs dark:bg-stone-800/70"
                  >
                    <Link
                      to={`/tools/${tool.slug}`}
                      onClick={onClose}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-stone-900 group-hover:text-amber-600 dark:text-stone-100 dark:group-hover:text-amber-400">
                          {tool.name}
                        </span>
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 dark:bg-stone-700/60 dark:text-stone-400">
                          {tool.category}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                        {tool.description}
                      </p>
                    </Link>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => togglePin(tool.slug)}
                        aria-label={`Unpin ${tool.name} from Quick Access`}
                        className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl text-amber-500 transition hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        title="Unpin from Quick Access"
                      >
                        <Star size={16} fill="currentColor" />
                      </button>

                      <Link
                        to={`/tools/${tool.slug}`}
                        onClick={onClose}
                        aria-label={`Launch ${tool.name}`}
                        className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl text-stone-400 transition hover:bg-stone-100 hover:text-stone-900 group-hover:translate-x-0.5 dark:hover:bg-stone-700/60 dark:hover:text-stone-100"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))}

                {!featuredTools.length && (
                  <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-xs text-stone-500 dark:border-stone-700">
                    <p className="font-semibold text-stone-700 dark:text-stone-300">No pinned tools</p>
                    <p className="mt-1">Search above or click the button below to restore the top tools.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--orbit-border)] bg-stone-50 px-5 py-3.5 dark:bg-stone-950/50 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <button
            type="button"
            onClick={() => setPinnedSlugs(TOP_FEATURED_SLUGS)}
            className="inline-flex items-center gap-1.5 font-semibold text-amber-700 hover:underline dark:text-amber-400"
          >
            <RotateCcw size={13} />
            <span>Reset to defaults</span>
          </button>

          <span className="text-[11px] text-stone-400">Press Esc to close</span>
        </div>
      </aside>
    </div>
  );
}

// Backward compatibility alias
export const QuickAccessModal = QuickAccessSidebar;
export default QuickAccessSidebar;
