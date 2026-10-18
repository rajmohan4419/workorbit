import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { preloadToolPage } from '../../lib/toolPageLoader';
import { ToolVisual } from './ToolVisual';

export function ResultRow({ tool, onUse, compact = false, favorite = false, onFavorite }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-3 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-xs transition">
      <Link to={`/tools/${tool.slug}`} onMouseEnter={() => preloadToolPage(tool.slug)} onFocus={() => preloadToolPage(tool.slug)} onTouchStart={() => preloadToolPage(tool.slug)} onClick={() => onUse(tool.slug)} className="min-w-0 flex-1 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg min-h-[44px]">
        <ToolVisual tool={tool} compact />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-stone-900 dark:text-stone-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 truncate">{tool.name}</div>
          {!compact && <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 truncate">{tool.description}</div>}
        </div>
        <ArrowRight size={15} className="shrink-0 text-stone-400 group-hover:text-violet-700 dark:group-hover:text-violet-400" />
      </Link>
      {onFavorite && (
        <button type="button" aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`} aria-pressed={favorite} onClick={() => onFavorite(tool.slug)} className="rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-400 hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-violet-500 flex items-center justify-center">
          <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  );
}

export function MicroCard({ tool, onUse }) {
  const getMicroTag = (t) => {
    if (['json-formatter', 'diff-checker', 'pdf-workspace', 'image-compressor', 'base64', 'jwt-decoder', 'svg-to-png', 'pdf-merge'].includes(t.slug)) {
      return '100% Client-Side';
    }
    if (['ctc-to-inhand', 'emi', 'sip', 'gst', 'income-tax-india', 'gratuity-calculator'].includes(t.slug)) {
      return 'Instant Calc';
    }
    return 'Privacy First';
  };

  return (
    <Link
      to={`/tools/${tool.slug}`}
      onMouseEnter={() => preloadToolPage(tool.slug)}
      onFocus={() => preloadToolPage(tool.slug)}
      onTouchStart={() => preloadToolPage(tool.slug)}
      onClick={() => onUse && onUse(tool.slug)}
      className="group flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-sm transition focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[110px]"
    >
      <div className="flex items-start justify-between gap-2">
        <ToolVisual tool={tool} compact />
        <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800 rounded-full px-2 py-0.5 truncate max-w-[110px]">
          {getMicroTag(tool)}
        </span>
      </div>
      <div className="mt-3 min-w-0">
        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 truncate">
          {tool.name}
        </h3>
      </div>
    </Link>
  );
}

export function ToolCard({ tool, favorite, onFavorite, onUse }) {
  return (
    <Link to={`/tools/${tool.slug}`} onMouseEnter={() => preloadToolPage(tool.slug)} onFocus={() => preloadToolPage(tool.slug)} onTouchStart={() => preloadToolPage(tool.slug)} onClick={() => onUse(tool.slug)} className="group overflow-hidden rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 hover:-translate-y-1 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-violet-500 flex flex-col justify-between">
      <div>
        <ToolVisual tool={tool} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">{tool.category}</span>
              <h2 className="mt-1 text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-violet-700 dark:group-hover:text-violet-400">{tool.name}</h2>
            </div>
            {onFavorite && (
              <button type="button" aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`} aria-pressed={favorite} onClick={e => { e.preventDefault(); e.stopPropagation(); onFavorite(tool.slug); }} className="rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-400 hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-violet-500 flex items-center justify-center">
                <Star size={17} fill={favorite ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300 line-clamp-2">{tool.description}</p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 dark:text-violet-400 group-hover:translate-x-1 transition-transform">Use tool <ArrowRight size={15} /></span>
      </div>
    </Link>
  );
}
