import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';

// Shared input and result components for all tool modules.

export function Field({ label, value, onChange, type = 'number', placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">{label}</span>
      <input
        type={type}
        min={type === 'number' ? 0 : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-200 dark:focus:ring-accent-900/50 min-h-[44px]"
      />
    </label>
  );
}

export function Result({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl border px-4 py-3 min-h-[44px] ${highlight
      ? 'border-accent-400/60 bg-accent-50/80 dark:bg-accent-950/50 dark:border-accent-700 flex flex-col gap-1'
      : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3'
    }`}>
      <span className={`text-xs font-medium shrink-0 ${highlight ? 'text-accent-600 dark:text-accent-400' : 'text-stone-600 dark:text-stone-300'}`}>{label}</span>
      <strong className={highlight
        ? 'text-lg sm:text-xl text-accent-700 dark:text-accent-300 font-bold break-words'
        : 'text-sm text-stone-900 dark:text-stone-100 font-semibold sm:text-right break-words min-w-0'
      }>{value}</strong>
    </div>
  );
}

export function ComingSoon({ tool }) {
  return (
    <div className="max-w-xl space-y-4 py-6">
      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{tool.name} is coming soon</h3>
      <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
        This tool isn't available yet. Explore the tools that work today.
      </p>
      <Link to="/tools" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-500 transition">
        Browse available tools <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">{label}</span>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 pl-4 pr-11 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]"
        >
          {children}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500" />
      </div>
    </label>
  );
}
