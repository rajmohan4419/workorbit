import { Search, Sparkles } from 'lucide-react';
import { ResultRow } from './ToolCard';

const categoryChips = [
  { name: 'All', label: 'All' },
  { name: 'Finance', label: 'Finance' },
  { name: 'Career', label: 'Career' },
  { name: 'Business', label: 'Business' },
  { name: 'Developer', label: 'Developer' },
  { name: 'Everyday', label: 'Everyday' },
];

export function ToolsHomeHero({ query, setQuery, category, setCategory, searchResults, addRecent, logEvent }) {
  const activeCategory = category || 'All';

  const handleChipClick = (catName) => {
    if (catName === 'All') {
      setCategory(null);
    } else {
      setCategory(catName);
    }
    setQuery('');
    if (logEvent) logEvent('category.chip_clicked', { category: catName });
  };

  return (
    <section className="orbit-enter mx-auto max-w-4xl px-2 py-8 sm:py-12 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/60 px-3.5 py-1.5 text-xs font-semibold text-violet-800 dark:text-violet-300">
        <Sparkles size={14} aria-hidden="true" /> Private • Fast • Client-Side
      </div>

      <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl lg:text-6xl">
        Free browser-based tools for <span className="text-violet-600 dark:text-violet-400">modern work.</span>
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-300 sm:text-base">
        Convert files, calculate salaries, format code and get work done in seconds.
      </p>

      {/* Prominent Floating Search Input */}
      <div className="relative mx-auto mt-6 sm:mt-8 max-w-2xl">
        <div className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-2 shadow-md transition-all focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200 dark:focus-within:ring-violet-900/50">
          <Search size={22} className="shrink-0 text-stone-400" aria-hidden="true" />
          <label htmlFor="tool-search" className="sr-only">Search online tools</label>
          <input
            id="tool-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCategory(null);
            }}
            placeholder="Search tools, e.g. PDF, salary, EMI, JSON, image…"
            className="w-full border-0 bg-transparent text-base text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 focus:ring-0 min-h-[44px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition min-h-[44px] flex items-center justify-center"
            >
              Clear
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {query && (
          <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-2 text-left shadow-2xl">
            <div className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-stone-400">
              {searchResults.length ? 'Matching tools' : 'No direct match yet'}
            </div>
            {searchResults.map((tool) => (
              <ResultRow key={tool.slug} tool={tool} onUse={addRecent} />
            ))}
            {!searchResults.length && (
              <div className="px-3 py-5 text-sm text-stone-500">Try salary, EMI, PDF, Excel, JSON or image.</div>
            )}
          </div>
        )}

        {/* Category Chips right beneath search bar */}
        <div className="mt-4 flex items-center justify-center">
          <div className="overflow-x-auto no-scrollbar scroll-smooth flex gap-2 max-w-full py-1 px-1">
            {categoryChips.map((chip) => {
              const isActive = activeCategory === chip.name;
              return (
                <button
                  key={chip.name}
                  type="button"
                  onClick={() => handleChipClick(chip.name)}
                  className={`min-h-[44px] min-w-[44px] shrink-0 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition flex items-center justify-center border ${
                    isActive
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 border-[var(--orbit-border)] hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-stone-800'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
