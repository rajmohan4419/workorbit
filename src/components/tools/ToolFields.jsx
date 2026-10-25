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
        className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-900/50 min-h-[44px]"
      />
    </label>
  );
}

export function Result({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between min-h-[44px] ${highlight ? 'border-violet-400/60 bg-violet-50/80 dark:bg-violet-950/50 dark:border-violet-700' : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800/50'}`}>
      <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{label}</span>
      <strong className={highlight ? 'text-base sm:text-lg text-violet-700 dark:text-violet-300 font-bold' : 'text-sm text-stone-900 dark:text-stone-100 font-semibold'}>{value}</strong>
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
      <Link to="/tools" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition">
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
