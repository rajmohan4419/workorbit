import { Search } from 'lucide-react';
import { ResultRow } from './ToolCard';

const categoryChips = [
  { name: 'All', label: 'All tools' },
  { name: 'Finance', label: 'Finance' },
  { name: 'Career', label: 'Career' },
  { name: 'Business', label: 'Business' },
  { name: 'Developer', label: 'Developer' },
  { name: 'Everyday', label: 'Everyday' },
];

export function ToolsHomeHero({ query, setQuery, onQueryChange, category, setCategory, searchResults, addRecent, logEvent }) {
  const activeCategory = category || 'All';

  const handleChipClick = (catName) => {
    if (catName === 'All') {
      setCategory(null);
    } else {
      setCategory(catName);
    }
    if (onQueryChange) onQueryChange('');
    else setQuery('');
    if (logEvent) logEvent('category.chip_clicked', { category: catName });
  };

  return (
    <section className="mx-auto max-w-3xl px-4 pt-10 pb-6 sm:pt-16 sm:pb-8 text-center">

      <h1 className="text-[2rem] sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50 leading-[1.15]">
        Get work done,{' '}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #2563eb 100%)' }}
        >
          without the friction.
        </span>
      </h1>

      <p className="mx-auto mt-4 max-w-md text-base text-stone-500 dark:text-stone-400 leading-relaxed">
        Salary calculators, PDF tools, JSON formatters, EMI & GST — all free, all in your browser. No sign-up needed.
      </p>

      {/* Search Input — ClickUp card style */}
      <div className="relative mx-auto mt-8 max-w-xl">
        <div
          className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 shadow-md transition-all duration-200 focus-within:border-violet-400 focus-within:ring-3 focus-within:ring-violet-400/15"
          style={{ minHeight: '52px' }}
        >
          <Search size={18} className="shrink-0 text-stone-400" aria-hidden="true" />
          <label htmlFor="tool-search" className="sr-only">Search tools</label>
          <input
            id="tool-search"
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              if (onQueryChange) onQueryChange(val);
              else setQuery(val);
            }}
            placeholder="Search — salary, EMI, PDF, JSON, image…"
            className="w-full border-0 bg-transparent py-3 text-sm text-stone-800 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:ring-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => { if (onQueryChange) onQueryChange(''); else setQuery(''); }}
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {query && (
          <div className="absolute z-30 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-2 text-left shadow-xl">
            <div className="px-3 pb-2 pt-1 text-[11px] text-stone-400 dark:text-stone-500">
              {searchResults.length ? `${searchResults.length} results` : 'No matches found'}
            </div>
            {searchResults.map((tool) => (
              <ResultRow key={tool.slug} tool={tool} onUse={addRecent} />
            ))}
            {!searchResults.length && (
              <div className="px-3 py-4 text-sm text-stone-500">Try: salary, EMI, PDF, Excel, JSON or image.</div>
            )}
          </div>
        )}
      </div>

      {/* Category Chips */}
      <div className="mt-4 flex items-center justify-center">
        <div className="overflow-x-auto no-scrollbar flex gap-2 py-1">
          {categoryChips.map((chip) => {
            const isActive = activeCategory === chip.name;
            return (
              <button
                key={chip.name}
                type="button"
                onClick={() => handleChipClick(chip.name)}
                onMouseEnter={() => {
                  if (chip.name !== 'All') {
                    window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: chip.name.toLowerCase() }));
                  }
                }}
                onMouseLeave={() => {
                  window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: category ? category.toLowerCase() : null }));
                }}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm transition-all duration-150 active:scale-[0.98] ${
                  isActive
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
