import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Menu, X, Sun, Moon, ArrowRight, ChevronDown, 
  BriefcaseBusiness, Coins, Code2, Calculator, TrendingUp, 
  ShieldCheck, FileText, Info, Mail, Heart, Globe, Zap
} from 'lucide-react';
import { LISTED_TOOLS } from '../../data/toolCatalog';
import { preloadToolPage } from '../../lib/toolPageLoader';
import { OrbitBoardIcon } from '../brand/OrbitBoardIcon';
import { QuickAccessSidebar } from './QuickAccessModal';

const categories = [
  { name: 'Finance', label: 'Finance & Money', icon: Coins, desc: 'Taxes, EMI, SIP, interest & currency' },
  { name: 'Career', label: 'Career & Salary', icon: BriefcaseBusiness, desc: 'CTC, hikes, notice periods & offers' },
  { name: 'Developer', label: 'Developer Tools', icon: Code2, desc: 'JSON, Base64, JWT, tokens & formatting' },
  { name: 'Everyday', label: 'Everyday Utilities', icon: Calculator, desc: 'PDFs, converters, images & diffs' },
  { name: 'Business', label: 'Business & SaaS', icon: TrendingUp, desc: 'SaaS metrics, aging & decision matrix' },
];

export function ToolsHomeHeader({ visitorCount, onSelectCategory, onSearchQuery }) {
  const navigate = useNavigate();
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
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);

  const toolsDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target)) {
        setToolsDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
        setToolsDropdownOpen(false);
        setMoreDropdownOpen(false);
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
    setToolsDropdownOpen(false);
    setDrawerOpen(false);
    if (onSelectCategory) {
      onSelectCategory(catName);
    } else {
      navigate(`/tools?category=${catName}`);
    }
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
          <Link to="/" aria-label="OrbitBoard home" className="text-xl font-black tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2.5 shrink-0 group">
            <OrbitBoardIcon size={32} className="transition-transform group-hover:scale-105" />
            <span className="tracking-tight">
              Orbit<span className="bg-gradient-to-r from-sky-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">Board</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 font-medium text-sm text-stone-600 dark:text-stone-300">
            {/* Tools Dropdown with Categories */}
            <div className="relative" ref={toolsDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setToolsDropdownOpen(prev => !prev);
                  setMoreDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl transition font-semibold ${
                  toolsDropdownOpen 
                    ? 'bg-stone-200/80 dark:bg-stone-800 text-accent-700 dark:text-accent-400' 
                    : 'hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 hover:text-accent-700 dark:hover:text-accent-400'
                }`}
                aria-expanded={toolsDropdownOpen}
                aria-haspopup="true"
              >
                <span>Tools</span>
                <ChevronDown size={14} className={`transition-transform duration-200 text-stone-400 ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-2 shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-1.5 border-b border-[var(--orbit-border)] mb-1">
                    <Link
                      to="/tools"
                      onClick={() => setToolsDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-accent-50 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300 text-xs font-bold hover:bg-accent-100 dark:hover:bg-accent-900/50 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Globe size={15} />
                        <span>All {LISTED_TOOLS.length} Tools Catalogue</span>
                      </span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>

                  <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">Categories</p>
                  <div className="space-y-0.5">
                    {categories.map(({ name, label, icon: Icon, desc }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleCategoryClick(name)}
                        className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left hover:bg-stone-100 dark:hover:bg-stone-800 transition group"
                      >
                        <span className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 group-hover:bg-accent-100 dark:group-hover:bg-accent-900 group-hover:text-accent-700 dark:group-hover:text-accent-300 transition">
                          <Icon size={16} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-accent-700 dark:group-hover:text-accent-400">{label}</p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* About Link */}
            <Link
              to="/about"
              className="px-3.5 py-2 min-h-[44px] rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 transition text-stone-700 dark:text-stone-200 hover:text-accent-700 dark:hover:text-accent-400 font-semibold inline-flex items-center"
            >
              About
            </Link>

            {/* Contact Link */}
            <Link
              to="/contact"
              className="px-3.5 py-2 min-h-[44px] rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 transition text-stone-700 dark:text-stone-200 hover:text-accent-700 dark:hover:text-accent-400 font-semibold inline-flex items-center"
            >
              Contact
            </Link>

            {/* Support Link */}
            <a
              href="/#support"
              className="px-3.5 py-2 min-h-[44px] rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/30 transition text-violet-700 dark:text-violet-400 font-semibold inline-flex items-center"
            >
              Support
            </a>

            {/* More / Other Sections Dropdown */}
            <div className="relative" ref={moreDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setMoreDropdownOpen(prev => !prev);
                  setToolsDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl transition font-semibold ${
                  moreDropdownOpen 
                    ? 'bg-stone-200/80 dark:bg-stone-800 text-accent-700 dark:text-accent-400' 
                    : 'hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 hover:text-accent-700 dark:hover:text-accent-400'
                }`}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="true"
              >
                <span>Legal & More</span>
                <ChevronDown size={14} className={`transition-transform duration-200 text-stone-400 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-2 shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="space-y-0.5">
                    <Link
                      to="/privacy"
                      onClick={() => setMoreDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-accent-700 dark:hover:text-accent-400 transition"
                    >
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>Privacy Policy</span>
                    </Link>
                    <Link
                      to="/terms"
                      onClick={() => setMoreDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-accent-700 dark:hover:text-accent-400 transition"
                    >
                      <FileText size={16} className="text-stone-500" />
                      <span>Terms of Service</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Search Trigger & Controls (Right) */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Quick Access Trigger */}
            <button
              type="button"
              onClick={() => setQuickAccessOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-amber-300/80 dark:border-amber-600/50 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-bold shadow-xs transition"
              title="Quick Access Top Featured Tools"
            >
              <Zap size={14} className="text-amber-500 fill-amber-400" />
              <span>Quick Access</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:border-accent-400 dark:hover:border-accent-500 text-xs font-medium shadow-xs transition"
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

          {/* Mobile Actions: Quick Access, Search trigger, Theme toggle & Hamburger menu */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => setQuickAccessOpen(true)}
              aria-label="Quick Access top tools"
              title="Quick Access"
              className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-amber-300/80 dark:border-amber-600/50 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center"
            >
              <Zap size={18} className="fill-amber-400 text-amber-500" />
            </button>

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
                <Link to="/" onClick={() => setDrawerOpen(false)} className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <OrbitBoardIcon size={26} />
                  <span>Orbit<span className="text-accent-600 dark:text-accent-400">Board</span></span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Main Top Navigation Sections */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">Main Sections</p>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      setQuickAccessOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-sm font-bold text-amber-800 dark:text-amber-200"
                  >
                    <span className="flex items-center gap-2.5">
                      <Zap size={16} className="text-amber-500 fill-amber-400" />
                      <span>Quick Access Tools</span>
                    </span>
                    <ArrowRight size={16} />
                  </button>

                  <Link
                    to="/tools"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-sm font-semibold text-stone-800 dark:text-stone-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <Globe size={16} className="text-accent-600" />
                      <span>All {LISTED_TOOLS.length} Tools</span>
                    </span>
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    to="/about"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-sm font-semibold text-stone-800 dark:text-stone-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <Info size={16} className="text-blue-500" />
                      <span>About Us</span>
                    </span>
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    to="/contact"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-sm font-semibold text-stone-800 dark:text-stone-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <Mail size={16} className="text-rose-500" />
                      <span>Contact Us</span>
                    </span>
                    <ArrowRight size={16} />
                  </Link>

                  <a
                    href="/#support"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/40 text-sm font-semibold text-violet-800 dark:text-violet-300"
                  >
                    <span className="flex items-center gap-2.5">
                      <Heart size={16} className="text-violet-600" />
                      <span>Support OrbitBoard</span>
                    </span>
                    <ArrowRight size={16} />
                  </a>

                  <Link
                    to="/privacy"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-sm font-semibold text-stone-800 dark:text-stone-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span>Privacy Policy</span>
                    </span>
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    to="/terms"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-sm font-semibold text-stone-800 dark:text-stone-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <FileText size={16} className="text-stone-500" />
                      <span>Terms of Service</span>
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Categories Links */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400 mb-3">Browse by Category</p>
                <nav className="space-y-1.5">
                  {categories.map(({ name, label, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleCategoryClick(name)}
                      className="w-full flex items-center justify-between px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-left text-sm font-semibold text-stone-800 dark:text-stone-100 hover:border-accent-400"
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={17} className="text-accent-600 dark:text-accent-400" />
                        <span>{label}</span>
                      </span>
                      <ArrowRight size={14} className="text-stone-400" />
                    </button>
                  ))}
                </nav>
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
              {['All', 'Finance', 'Career', 'Developer', 'Everyday', 'Business'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSearchQuery(cat === 'All' ? '' : cat)}
                  className="px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-stone-700 shrink-0 transition"
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
                    className="w-full flex items-center justify-between p-3 min-h-[44px] rounded-xl border border-stone-100 dark:border-stone-800 hover:border-accent-300 dark:hover:border-accent-600 bg-stone-50/50 dark:bg-stone-800/50 hover:bg-accent-50/60 dark:hover:bg-accent-900/20 text-left transition group"
                  >
                    <div>
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-accent-700 dark:group-hover:text-accent-400">
                        {tool.name}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-md">{tool.description}</div>
                    </div>
                    <span className="text-xs font-semibold text-accent-600 dark:text-accent-400 shrink-0">Open →</span>
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

      <QuickAccessSidebar isOpen={quickAccessOpen} onClose={() => setQuickAccessOpen(false)} />
    </>
  );
}
