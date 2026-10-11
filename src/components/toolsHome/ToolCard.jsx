import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { preloadToolPage } from '../../lib/toolPageLoader';
import { ToolVisual } from './ToolVisual';

export function ResultRow({ tool, onUse, compact = false, favorite = false, onFavorite }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-[#e7dfd3] bg-white p-3 hover:border-violet-300 hover:shadow-sm">
      <Link to={`/tools/${tool.slug}`} onMouseEnter={preloadToolPage} onFocus={preloadToolPage} onTouchStart={preloadToolPage} onClick={() => onUse(tool.slug)} className="min-w-0 flex-1 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg">
        <ToolVisual tool={tool} compact />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-stone-900 group-hover:text-violet-700 truncate">{tool.name}</div>
          {!compact && <div className="mt-0.5 text-xs text-stone-500 truncate">{tool.description}</div>}
        </div>
        <ArrowRight size={15} className="shrink-0 text-stone-400 group-hover:text-violet-700" />
      </Link>
      {onFavorite && (
        <button type="button" aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`} aria-pressed={favorite} onClick={() => onFavorite(tool.slug)} className="rounded-lg p-2 text-stone-400 hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-violet-500">
          <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  );
}

export function ToolCard({ tool, favorite, onFavorite, onUse }) {
  return (
    <Link to={`/tools/${tool.slug}`} onMouseEnter={preloadToolPage} onFocus={preloadToolPage} onTouchStart={preloadToolPage} onClick={() => onUse(tool.slug)} className="group overflow-hidden rounded-2xl border border-[#e7dfd3] bg-white hover:-translate-y-1 hover:border-violet-300 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-violet-500">
      <ToolVisual tool={tool} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">{tool.category}</span>
            <h2 className="mt-1 text-lg font-bold text-stone-900 group-hover:text-violet-700">{tool.name}</h2>
          </div>
          <button type="button" aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`} aria-pressed={favorite} onClick={e => { e.preventDefault(); e.stopPropagation(); onFavorite(tool.slug); }} className="rounded-lg p-2 text-stone-400 hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-violet-500">
            <Star size={17} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">{tool.description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700">Use tool <ArrowRight size={15} /></span>
      </div>
    </Link>
  );
}
