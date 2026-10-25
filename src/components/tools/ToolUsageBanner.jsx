import { Sparkles, Crown, Lock, ArrowRight } from 'lucide-react';
import { usePro } from '../../context/ProContext';

export function ToolUsageBanner({ tool }) {
  const { isPro, daysRemaining, getUsage, openProModal } = usePro();

  if (!tool) return null;

  const usageCount = getUsage(tool.slug);

  if (isPro) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
            <Crown size={12} strokeWidth={2.5} />
          </span>
          <span>
            <strong>OrbitBoard Pro Active</strong> • Unlimited usage across all tools ({daysRemaining} days remaining)
          </span>
        </div>
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          PRO PASS
        </span>
      </div>
    );
  }

  if (usageCount >= 1) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-50 via-violet-50/40 to-amber-50/80 dark:from-amber-950/40 dark:via-violet-950/20 dark:to-stone-900 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
            <Lock size={13} strokeWidth={2.5} />
          </span>
          <div>
            <p className="font-bold text-stone-900 dark:text-stone-100">
              1st Free Run Used on {tool.name}
            </p>
            <p className="text-stone-600 dark:text-stone-400 text-[11px]">
              Unlock unlimited runs, exports, and private local processing on all 20+ tools.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            openProModal({
              toolSlug: tool.slug,
              toolName: tool.name,
              actionName: 'Unlock Unlimited Runs',
            })
          }
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs transition"
        >
          <Sparkles size={13} />
          <span>Unlock All Tools for ₹19</span>
          <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  // 1st run is free!
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/60 dark:bg-violet-950/30 text-xs text-stone-700 dark:text-stone-300">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
          <Sparkles size={12} />
        </span>
        <span>
          <strong>1 Free Run Available</strong> for {tool.name} • 100% private, runs directly in your browser
        </span>
      </div>

      <button
        type="button"
        onClick={() =>
          openProModal({
            toolSlug: tool.slug,
            toolName: tool.name,
            actionName: 'Get Pro Access',
          })
        }
        className="shrink-0 font-semibold text-violet-700 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 transition"
      >
        <span>Get Unlimited Pro (₹19/mo)</span>
        <ArrowRight size={12} />
      </button>
    </div>
  );
}
