import { Copy, Check } from 'lucide-react';

export default function ConversionResultsCard({ conversion, isCopied, onCopySingle }) {
  const { tzObj, info, diffText, dayBadge, dayDiff } = conversion;
  const singleText = `${tzObj.name}: ${info.formatted} (${diffText})`;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-sm text-white">{tzObj.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {info.tzName}
          </span>
          {dayDiff !== 0 && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                dayDiff > 0
                  ? 'bg-amber-950/60 border border-amber-800/60 text-amber-300'
                  : 'bg-cyan-950/60 border border-cyan-800/60 text-cyan-300'
              }`}
            >
              {dayBadge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          {tzObj.city} • {tzObj.region}
        </p>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-900">
        <div className="text-left sm:text-right">
          <div className="text-base sm:text-lg font-bold text-accent-300 font-mono">
            {info.formatted}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Offset vs source: <span className="text-slate-300">{diffText}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCopySingle(tzObj.id, singleText)}
          aria-label={`Copy ${tzObj.name} converted time`}
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition shrink-0"
        >
          {isCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
