import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ToolCard } from './ToolCard';

const categoryMeta = {
  Business: { label: 'Business & SaaS', description: 'SaaS metrics, invoice aging, pipeline forecaster and decision matrices.' },
  Finance: { label: 'Finance & Money', description: 'Loans, GST, investments and everyday money math.' },
  Developer: { label: 'Developer Tools', description: 'Browser utilities for data, encoding, and technical workflows.' },
  Career: { label: 'Career & Salary', description: 'Salary, offers, notice periods and career decisions.' },
  Everyday: { label: 'Everyday Utilities', description: 'Converters, practical file utilities and image tools.' },
};

const CATEGORY_KEYS = ['Business', 'Finance', 'Developer', 'Career', 'Everyday'];

export function CategoryExplorer({ query, category, chooseCategory, setCategory, categoryTools, addRecent, favorites, toggleFavorite }) {
  const meta = categoryMeta[category] || { label: category || '', description: '' };

  useEffect(() => {
    if (category) {
      window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: category.toLowerCase() }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: null }));
    };
  }, [category]);

  if (!category || query) return null;
  
  const handleSelect = (cat) => {
    if (chooseCategory) chooseCategory(cat);
    else if (setCategory) setCategory(cat);
  };

  const handleClear = () => {
    handleSelect(null);
  };

  return (
    <section className="mx-auto mt-6 max-w-6xl border-t border-[var(--orbit-border)] pt-6 anim-fade-up" style={{ '--stagger-index': 0 }}>
      {/* Category Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-accent-700 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/60 hover:bg-accent-100 dark:hover:bg-accent-900/60 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
        >
          <ChevronLeft size={15} /> Back to all categories
        </button>

        {/* Sliding category tabs with hover theme preview */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {CATEGORY_KEYS.map((catKey) => {
            const isCurrent = category === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => handleSelect(catKey)}
                onMouseEnter={() => window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: catKey.toLowerCase() }))}
                onMouseLeave={() => window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: category ? category.toLowerCase() : null }))}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                  isCurrent
                    ? 'bg-accent-600 text-white shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 border border-[var(--orbit-border)]'
                }`}
              >
                {categoryMeta[catKey]?.label || catKey}
              </button>
            );
          })}
        </div>

        <span className="shrink-0 text-xs font-semibold text-stone-700 dark:text-stone-300">
          {categoryTools.length} tools in {meta.label}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">Selected Category</p>
        <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{meta.label}</h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300">{meta.description}</p>
      </div>

      {/* Staggered Grid Re-entry */}
      <div key={category} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categoryTools.map((tool, index) => (
          <div
            key={tool.slug}
            style={{ '--stagger-index': Math.min(index, 8) }}
            className="anim-fade-up"
          >
            <ToolCard
              tool={tool}
              onUse={addRecent}
              favorite={favorites.includes(tool.slug)}
              onFavorite={toggleFavorite}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default CategoryExplorer;
