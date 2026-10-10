import { Copy, Check } from 'lucide-react';
import ConversionResultsCard from './ConversionResultsCard';

export default function ConversionResultsList({
  conversions,
  copiedAll,
  copiedSingle,
  onCopyAll,
  onCopySingle
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          Converted Time Comparison
        </h3>

        {conversions.length > 0 && (
          <button
            type="button"
            onClick={onCopyAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          >
            {copiedAll ? <Check size={14} /> : <Copy size={14} />}
            {copiedAll ? 'Copied All Results!' : 'Copy All Results'}
          </button>
        )}
      </div>

      {conversions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
          Select one or more destination time zones above to compare times.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {conversions.map(c => (
            <ConversionResultsCard
              key={c.tzObj.id}
              conversion={c}
              isCopied={copiedSingle === c.tzObj.id}
              onCopySingle={onCopySingle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
