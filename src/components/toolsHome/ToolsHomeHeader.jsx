import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Sun, Moon, ArrowRight, BriefcaseBusiness, Coins, Code2, Calculator, Sparkles, TrendingUp } from 'lucide-react';
import { LISTED_TOOLS } from '../../data/toolCatalog';
import { preloadToolPage } from '../../lib/toolPageLoader';
import { usePro } from '../../context/ProContext';

const categories = [
  { name: 'Finance', label: 'Finance', icon: Coins },
  { name: 'Career', label: 'Career', icon: BriefcaseBusiness },
  { name: 'Developer', label: 'Developer', icon: Code2 },
  { name: 'Business', label: 'Business', icon: TrendingUp },
  { name: 'Everyday', label: 'Productivity', icon: Calculator },
];

export function ToolsHomeHeader({ visitorCount, onSelectCategory, onSearchQuery }) {
  const navigate = useNavigate();
  const { isPro, daysRemaining, openProModal } = usePro();
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('orbitboard:theme') === 'dark' || document.documentElement.classList.contains('dark');
    } catch {
      return false;
    }
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronize dark theme class with html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('orbitboard:theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('orbitboard:theme', 'light');
    }
  }, [isDark]);

  // Global Cmd+K / Ctrl+K listener for quick-search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Search results calculation
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return LISTED_TOOLS.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.slug.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  const handleCategoryClick = (catName) => {
    if (onSelectCategory) {
      onSelectCategory(catName);
    } else {
      navigate(`/?category=${catName}`);
    }
    setDrawerOpen(false);
  };

  const handleToolClick = (slug) => {
    setSearchOpen(false);
    setDrawerOpen(false);
    setSearchQuery('');
    navigate(`/tools/${slug}`);
  };

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-violet-600 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-[var(--orbit-border)] bg-[var(--orbit-canvas)]/95 backdrop-blur transition-colors">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo (Left) */}
          <Link to="/" aria-label="OrbitBoard home" className="text-xl font-black tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-xs">O</span>
            ORBIT<span className="text-violet-600 dark:text-violet-400">BOARD</span>
          </Link>

          {/* Desktop Navigation Category Links */}
          <nav className="hidden lg:flex items-center gap-1 font-medium text-sm text-stone-600 dark:text-stone-300">
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryClick(cat.name)}
                className="px-3.5 py-2 min-h-[44px] rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 transition text-stone-700 dark:text-stone-200 hover:text-violet-700 dark:hover:text-violet-400 font-semibold"
              >
                {cat.label}
              </button>
            ))}
            <a
              href="/#support"
              className="px-3.5 py-2 min-h-[44px] rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/30 transition text-violet-700 dark:text-violet-400 font-semibold"
            >
              Support
            </a>
          </nav>

          {/* Desktop Search Trigger & Controls (Right) */}
          <div className="hidden sm:flex items-center gap-3">
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                ⚡ Pro ({daysRemaining}d)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => openProModal({ toolName: 'All Tools', actionName: 'Pro Access' })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xs transition"
              >
                <Sparkles size={13} />
                <span>Pro • ₹19</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:border-violet-400 dark:hover:border-violet-500 text-xs font-medium shadow-xs transition"
            >
              <Search size={16} className="text-stone-400" />
              <span>Search tools…</span>
              <kbd className="ml-2 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 dark:text-stone-400">Cmd + K</kbd>
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center justify-center"
            >
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-stone-600" />}
            </button>
          </div>

          {/* Mobile Actions: Search trigger, Theme toggle & Hamburger menu */}
          <div className="flex sm:hidden items-center gap-1.5">
            {!isPro && (
              <button
                type="button"
                onClick={() => openProModal({ toolName: 'All Tools', actionName: 'Pro Access' })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold shadow-xs"
              >
                <Sparkles size={11} />
                <span>₹19</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search tools"
              className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 flex items-center justify-center"
            >
              <Search size={18} />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 flex items-center justify-center"
            >
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-label="Toggle menu"
              aria-expanded={drawerOpen}
              className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 flex items-center justify-center"
            >
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <aside className="relative ml-auto w-4/5 max-w-sm h-full bg-[var(--orbit-canvas)] dark:bg-stone-900 p-6 flex flex-col justify-between shadow-2xl border-l border-[var(--orbit-border)] overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--orbit-border)] pb-4">
                <Link to="/" onClick={() => setDrawerOpen(false)} className="text-lg font-black text-stone-900 dark:text-white">
                  ORBIT<span className="text-violet-600">BOARD</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Categories Links */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 mb-3">Categories</p>
                <nav className="space-y-2">
                  {categories.map(({ name, label, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleCategoryClick(name)}
                      className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-left text-sm font-semibold text-stone-800 dark:text-stone-100 hover:border-violet-400"
                    >
                      <Icon size={18} className="text-violet-600 dark:text-violet-400" />
                      <span>{label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Quick actions */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">Quick Navigation</p>
                <div className="space-y-2">
                  <Link
                    to="/tools"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-sm font-semibold text-stone-800 dark:text-stone-100"
                  >
                    <span>Full Tool Catalogue</span>
                    <ArrowRight size={16} />
                  </Link>
                  <a
                    href="/#support"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/40 text-sm font-semibold text-violet-800 dark:text-violet-300"
                  >
                    <span>Support & Pro</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-6 border-t border-[var(--orbit-border)] space-y-3">
              {visitorCount !== null && (
                <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  {visitorCount.toLocaleString()} visitors
                </div>
              )}
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Free • No sign-up required</div>
            </div>
          </aside>
        </div>
      )}

      {/* Full-Screen / Slide-Down Global Quick Search Dialog Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-2xl p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--orbit-border)] pb-3">
              <Search size={20} className="text-stone-400 shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (onSearchQuery) onSearchQuery(e.target.value);
                }}
                placeholder="Type to search tools (e.g., CTC, EMI, PDF, JSON)…"
                className="w-full bg-transparent text-base sm:text-lg text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="px-2.5 py-1 min-h-[44px] text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              >
                Esc
              </button>
            </div>

            {/* Category Filter Chips inside Search Dialog */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {['All', 'Finance', 'Career', 'Developer', 'Everyday'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSearchQuery(cat === 'All' ? '' : cat)}
                  className="px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-stone-700 shrink-0 transition"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
              {searchResults.length > 0 ? (
                searchResults.map((tool) => (
                  <button
                    key={tool.slug}
                    type="button"
                    onMouseEnter={() => preloadToolPage(tool.slug)}
                    onClick={() => handleToolClick(tool.slug)}
                    className="w-full flex items-center justify-between p-3 min-h-[44px] rounded-xl border border-stone-100 dark:border-stone-800 hover:border-violet-300 dark:hover:border-violet-600 bg-stone-50/50 dark:bg-stone-800/50 hover:bg-violet-50/60 dark:hover:bg-violet-900/20 text-left transition group"
                  >
                    <div>
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-violet-700 dark:group-hover:text-violet-400">
                        {tool.name}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-md">{tool.description}</div>
                    </div>
                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 shrink-0">Open →</span>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">No matching tools found for "{searchQuery}".</div>
              ) : (
                <div className="py-6 text-center text-xs text-stone-400 dark:text-stone-500">Search by keywords like salary, tax, image, convert, diff, or PDF.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
