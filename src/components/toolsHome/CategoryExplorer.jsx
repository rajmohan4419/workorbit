import { ChevronLeft } from 'lucide-react';
import { ToolCard } from './ToolCard';

const categoryMeta = {
  Career: { label: 'Career & Salary', description: 'Salary, offers, notice periods and career decisions.' },
  Finance: { label: 'Money & Finance', description: 'Loans, GST, investments and everyday money math.' },
  Everyday: { label: 'Everyday Tools', description: 'Converters and practical file utilities.' },
  Developer: { label: 'Developer Tools', description: 'Browser utilities for data and technical work.' }
};

export function CategoryExplorer({ query, category, setCategory, categoryTools, addRecent, favorites, toggleFavorite }) {
  if (!category || query) return null;
  const meta = categoryMeta[category] || { label: category, description: '' };
  return (
    <section className="mx-auto mt-8 max-w-6xl border-t border-stone-200 pt-6">
      <button type="button" onClick={() => setCategory(null)} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900">
        <ChevronLeft size={16} /> All tools
      </button>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Browse category</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-900">{meta.label}</h2>
          <p className="mt-1 text-sm text-stone-600">{meta.description}</p>
        </div>
        <span className="shrink-0 text-xs text-stone-500">{categoryTools.length} tools shown</span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categoryTools.map(tool => <ToolCard key={tool.slug} tool={tool} onUse={addRecent} favorite={favorites.includes(tool.slug)} onFavorite={toggleFavorite} />)}
      </div>
    </section>
  );
}
