import { useMemo, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Calculator, Code2, Coins, Search, TrendingUp, Filter, X } from 'lucide-react';
import { LISTED_TOOLS } from '../data/toolCatalog';
import { preloadToolPage } from '../lib/toolPageLoader';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';

const categories = [
  { name: 'All', label: 'All utilities', icon: Search },
  { name: 'Career', label: 'Career & Salary', icon: BriefcaseBusiness },
  { name: 'Business', label: 'Business & SaaS', icon: TrendingUp },
  { name: 'Finance', label: 'Money & Finance', icon: Coins },
  { name: 'Everyday', label: 'Everyday Utilities', icon: Calculator },
  { name: 'Developer', label: 'Developer Tools', icon: Code2 }
];

export default function ToolsCatalogue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || searchParams.get('search');
  const category = searchParams.get('category') || 'All';
  const [query, setQuery] = useState('');

  const handleCategoryChange = (newCat) => {
    const next = new URLSearchParams(searchParams);
    if (newCat === 'All') {
      next.delete('category');
      window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: null }));
    } else {
      next.set('category', newCat);
      window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: newCat.toLowerCase() }));
    }
    setSearchParams(next);
  };

  const filteredTools = useMemo(() => LISTED_TOOLS.filter(tool => {
    const categoryMatch = category === 'All' || tool.category === category;
    const haystack = `${tool.name} ${tool.description} ${tool.slug}`.toLowerCase();
    return categoryMatch && haystack.includes(query.trim().toLowerCase());
  }), [category, query]);

  if (q) return <Navigate to={`/?q=${encodeURIComponent(q)}`} replace />;

  return (
    <div className="orbit-light min-h-screen bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors flex">
      <QuickAccessLeftSidebar />
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <ToolsHomeHeader />

          <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="orbit-enter max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-700 dark:text-accent-400">OrbitBoard catalogue</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Every tool, when you need it.</h1>
            <p className="mt-2 text-xs sm:text-sm leading-6 text-stone-600 dark:text-stone-300">A calmer, organised workspace for work, money, everyday tasks and developer workflows.</p>
          </div>

          {/* Filter Bar with Category Dropdown & Quick Selector */}
          <section className="orbit-card-enter mt-8 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 sm:p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[minmax(240px,.8fr)_minmax(0,1.2fr)]">
              <div className="flex flex-col gap-2">
                <label htmlFor="catalog-category" className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-200">
                  <Filter size={15} className="text-accent-600 dark:text-accent-400" />
                  <span>Category</span>
                </label>
                <select 
                  id="catalog-category"
                  value={category} 
                  onChange={e => handleCategoryChange(e.target.value)} 
                  className="h-12 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 px-3.5 text-sm font-medium text-stone-800 dark:text-stone-100 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-400/30 cursor-pointer transition-colors"
                >
                  {categories.map(item => (
                    <option key={item.name} value={item.name} className="dark:bg-stone-900">
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="catalog-search" className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                  Find a utility
                </label>
                <div className="relative">
                  <Search 
                    size={18} 
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" 
                    aria-hidden="true" 
                  />
                  <input 
                    id="catalog-search"
                    type="text"
                    value={query} 
                    onChange={e => setQuery(e.target.value)} 
                    placeholder="Search by name or purpose…" 
                    className="h-12 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 pl-10 pr-10 text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-400/30 transition-all" 
                  />
                  {query && (
                    <button 
                      type="button" 
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="mt-4 pt-3 border-t border-[var(--orbit-border)] flex items-center gap-2 overflow-x-auto no-scrollbar">
              {categories.map(({ name, label, icon: Icon }) => {
                const isActive = category === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleCategoryChange(name)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 min-h-[36px] ${
                      isActive 
                        ? 'bg-accent-600 text-white shadow-xs' 
                        : 'border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:border-accent-400'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-white' : 'text-accent-600 dark:text-accent-400'} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs font-medium text-stone-600 dark:text-stone-300">{filteredTools.length} utilities shown</p>
          </section>

          <section className="orbit-enter mt-6 overflow-hidden rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300 border-b border-[var(--orbit-border)]">
                  <tr>
                    <th className="px-5 py-4 font-bold">Utility</th>
                    <th className="px-5 py-4 font-bold">Category</th>
                    <th className="px-5 py-4 font-bold">What it does</th>
                    <th className="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTools.map((tool, index) => (
                    <tr 
                      key={tool.slug} 
                      className="group border-t border-[var(--orbit-border)] hover:bg-accent-50/30 dark:hover:bg-accent-950/20 transition-colors duration-150" 
                      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
                    >
                      <td className="px-5 py-4">
                        <Link 
                          to={`/tools/${tool.slug}`} 
                          onMouseEnter={() => preloadToolPage(tool.slug)} 
                          onFocus={() => preloadToolPage(tool.slug)} 
                          className="font-bold text-stone-900 dark:text-stone-100 hover:text-accent-700 dark:hover:text-accent-400 transition-colors"
                        >
                          {tool.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-accent-50 dark:bg-accent-950/60 border border-accent-200 dark:border-accent-800 px-2.5 py-1 text-xs font-semibold text-accent-700 dark:text-accent-300 transition-colors">
                          {tool.category}
                        </span>
                      </td>
                      <td className="max-w-xl px-5 py-4 text-sm leading-6 text-stone-600 dark:text-stone-300">{tool.description}</td>
                      <td className="px-5 py-4 text-right">
                        <Link 
                          aria-label={`Open ${tool.name}`} 
                          to={`/tools/${tool.slug}`} 
                          onMouseEnter={() => preloadToolPage(tool.slug)} 
                          className="inline-flex rounded-lg p-2 text-accent-700 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950 group-hover:translate-x-1 transition-all duration-200"
                        >
                          <ArrowRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!filteredTools.length && (
                    <tr>
                      <td colSpan="4" className="px-5 py-12 text-center text-sm text-stone-500 dark:text-stone-400">
                        No utilities match that search. Try another term or category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <ToolsHomeFooter />
      </div>
    </div>
  );
}
