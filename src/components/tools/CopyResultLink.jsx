import { useState, useCallback } from 'react';
import { Share2, Check, Sparkles } from 'lucide-react';
import { buildShareUrl } from '../../data/toolParams';
import { useToolShareContext } from '../../lib/shareResults';

/**
 * Reusable component that copies the parameterized deep-link for a calculator result
 * and provides a 1-click trigger to open the viral social scorecard modal.
 */
export function CopyResultLink({ slug, params, label = 'Copy link to this result' }) {
  const { openShareModal } = useToolShareContext();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = buildShareUrl(slug, params);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // fallback
    }
  }, [slug, params]);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full pt-1">
      <button
        type="button"
        onClick={handleCopy}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-850 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-accent-600 dark:hover:text-accent-400 transition shadow-2xs cursor-pointer active:scale-[0.98]"
      >
        {copied ? (
          <>
            <Check size={14} className="text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Link Copied!</span>
          </>
        ) : (
          <>
            <Share2 size={14} className="text-stone-400" />
            <span>{label}</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => openShareModal()}
        className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-accent-200 dark:border-accent-800 bg-accent-50/70 dark:bg-accent-950/40 hover:bg-accent-100 dark:hover:bg-accent-900/50 text-xs font-semibold text-accent-700 dark:text-accent-300 transition shadow-2xs cursor-pointer active:scale-[0.98]"
        title="Generate and share visual scorecard to WhatsApp, X, LinkedIn, Telegram"
      >
        <Sparkles size={14} className="text-amber-500" />
        <span>Share Scorecard</span>
      </button>
    </div>
  );
}

export default CopyResultLink;

