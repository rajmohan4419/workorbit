import { ChevronLeft } from 'lucide-react';
import { ToolCard } from './ToolCard';

const categoryMeta = {
  Career: { label: 'Career & Salary', description: 'Salary, offers, notice periods and career decisions.' },
  Finance: { label: 'Finance & Money', description: 'Loans, GST, investments and everyday money math.' },
  Everyday: { label: 'Everyday Utilities', description: 'Converters, practical file utilities and image tools.' },
  Developer: { label: 'Developer Tools', description: 'Browser utilities for data, encoding, and technical workflows.' },
  Business: { label: 'Business & SaaS', description: 'SaaS metrics, invoice aging, pipeline forecaster and decision matrices.' }
};

export function CategoryExplorer({ query, category, chooseCategory, setCategory, categoryTools, addRecent, favorites, toggleFavorite }) {
  if (!category || query) return null;
  const meta = categoryMeta[category] || { label: category, description: '' };
  const handleClear = () => {
    if (chooseCategory) chooseCategory(null);
    else if (setCategory) setCategory(null);
  };

  return (
    <section className="mx-auto mt-6 max-w-6xl border-t border-[var(--orbit-border)] pt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-accent-700 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/60 hover:bg-accent-100 dark:hover:bg-accent-900/60 transition"
        >
          <ChevronLeft size={15} /> Back to all categories
        </button>
        <span className="shrink-0 text-xs font-medium text-stone-500 dark:text-stone-400">
          {categoryTools.length} tools in {meta.label}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">Selected Category</p>
        <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{meta.label}</h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300">{meta.description}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categoryTools.map(tool => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            onUse={addRecent}
            favorite={favorites.includes(tool.slug)}
            onFavorite={toggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}

export default CategoryExplorer;
