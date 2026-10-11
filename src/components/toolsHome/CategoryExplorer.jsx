import { ArrowRight, BriefcaseBusiness, Calculator, ChevronLeft, Code2, Coins, WandSparkles } from 'lucide-react';
import { ToolCard } from './ToolCard';

const categories = ['Career', 'Finance', 'Everyday', 'Developer'];

const categoryImages = {
  Career: '/images/category-career.svg',
  Finance: '/images/category-finance.svg',
  Everyday: '/images/category-everyday.svg',
  Developer: '/images/category-developer.svg'
};

const categoryMeta = {
  Career: {
    icon: BriefcaseBusiness,
    label: 'Career & Salary',
    description: 'Salary, offers, notice periods and career decisions.'
  },
  Finance: {
    icon: Coins,
    label: 'Money & Finance',
    description: 'Loans, GST, investments and everyday money math.'
  },
  Everyday: {
    icon: Calculator,
    label: 'Everyday',
    description: 'Converters and practical file utilities.'
  },
  Developer: {
    icon: Code2,
    label: 'Developer Tools',
    description: 'Fast browser utilities for data and technical work.'
  }
};

export function CategoryExplorer({
  query,
  category,
  setCategory,
  chooseCategory,
  categoryTools,
  addRecent,
  favorites,
  toggleFavorite
}) {
  return (
    <>
      {!query && (
        <div className="mt-12 max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-slate-600">
            <WandSparkles size={14} /> Explore by intent
          </div>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.map(name => {
              const meta = categoryMeta[name];
              const Icon = meta.icon;
              return (
                <button key={name} type="button" onClick={() => chooseCategory(name)} className="group relative overflow-hidden text-left rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:-translate-y-1 hover:border-violet-500/50 transition">
                  <img src={categoryImages[name]} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-20 transition duration-500 group-hover:scale-105 group-hover:opacity-30" />
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-violet-950/50" aria-hidden="true" />
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center"><Icon size={20} /></div>
                    <h2 className="mt-4 font-bold text-white group-hover:text-violet-400">{meta.label}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{meta.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-400">Explore <ArrowRight size={13} /></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {category && !query && (
        <div className="mt-10 max-w-6xl mx-auto">
          <button type="button" onClick={() => setCategory(null)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-white">
            <ChevronLeft size={16} /> All areas
          </button>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Explore</p>
              <h2 className="mt-1 text-2xl font-black">{categoryMeta[category].label}</h2>
            </div>
            <span className="text-xs text-slate-600">{categoryTools.length} shown</span>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {categoryTools.map(tool => <ToolCard key={tool.slug} tool={tool} onUse={addRecent} favorite={favorites.includes(tool.slug)} onFavorite={toggleFavorite} />)}
          </div>
        </div>
      )}
    </>
  );
}
