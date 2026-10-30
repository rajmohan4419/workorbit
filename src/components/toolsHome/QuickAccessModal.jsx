import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Star, X, Search, ArrowRight, Sparkles } from 'lucide-react';
import { LISTED_TOOLS } from '../../data/toolCatalog';
import { preloadToolPage } from '../../lib/toolPageLoader';

// Top featured tools permanently pinned for rapid workflow
const TOP_FEATURED_SLUGS = [
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

export function QuickAccessModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
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

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
      t.category.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-3xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--orbit-border)] flex items-center justify-between gap-3 bg-[var(--orbit-canvas)] dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Zap size={20} className="fill-amber-500/20" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Quick Access</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  {pinnedSlugs.length} tools
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Jump directly to high-frequency everyday tools</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search within Quick Access */}
        <div className="p-4 border-b border-[var(--orbit-border)] bg-stone-50/50 dark:bg-stone-900/50">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools to pin or launch…"
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* If user is actively searching */}
          {search.trim() ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2.5">Search Results</p>
              <div className="space-y-2">
                {filteredTools.map(tool => {
                  const isPinned = pinnedSlugs.includes(tool.slug);
                  return (
                    <div 
                      key={tool.slug}
                      className="flex items-center justify-between p-3 rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800/40 hover:border-amber-400 transition group"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/tools/${tool.slug}`);
                        }}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 transition">
                          {tool.name}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-sm">
                          {tool.description}
                        </p>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => togglePin(tool.slug)}
                          className={`p-2 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                            isPinned 
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' 
                              : 'hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400'
                          }`}
                          title={isPinned ? 'Remove from Quick Access' : 'Pin to Quick Access'}
                        >
                          <Star size={14} fill={isPinned ? 'currentColor' : 'none'} />
                          <span className="text-[11px]">{isPinned ? 'Pinned' : 'Pin'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate(`/tools/${tool.slug}`);
                          }}
                          className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!filteredTools.length && (
                  <p className="text-xs text-stone-400 py-4 text-center">No matching tools found.</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Top Featured & Pinned Tools</span>
                </p>
                <span className="text-[11px] text-stone-400">Click star to customize</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {featuredTools.map(tool => {
                  return (
                    <div
                      key={tool.slug}
                      onMouseEnter={() => preloadToolPage(tool.slug)}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800/60 hover:border-amber-400 dark:hover:border-amber-500 shadow-2xs hover:shadow-xs transition"
                    >
                      <Link
                        to={`/tools/${tool.slug}`}
                        onClick={onClose}
                        className="flex-1 min-w-0 pr-2"
                      >
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition truncate">
                          {tool.name}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {tool.category} • {tool.description}
                        </p>
                      </Link>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePin(tool.slug)}
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                          title="Unpin from Quick Access"
                        >
                          <Star size={15} fill="currentColor" />
                        </button>

                        <Link
                          to={`/tools/${tool.slug}`}
                          onClick={onClose}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 group-hover:translate-x-0.5 transition-transform"
                        >
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-950/40 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span>Tip: You can pin or unpin any tool to keep your favorites handy</span>
          <button
            type="button"
            onClick={() => setPinnedSlugs(TOP_FEATURED_SLUGS)}
            className="hover:underline text-amber-700 dark:text-amber-400 font-semibold"
          >
            Reset to default top tools
          </button>
        </div>
      </div>
    </div>
  );
}
export default QuickAccessModal;

