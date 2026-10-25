import { useState } from 'react';
import { Field } from '../../components/tools/ToolFields';
import { money } from '../../lib/toolFormat';
import { computeSaasRetention, rateMetric } from './saasRetention';

const RATING_TEXT = {
  good: 'Healthy',
  ok: 'Watch',
  weak: 'Needs work',
  na: 'Needs more data',
};
const RATING_CLASS = {
  good: 'text-emerald-700 dark:text-emerald-300',
  ok: 'text-amber-700 dark:text-amber-300',
  weak: 'text-rose-700 dark:text-rose-300',
  na: 'text-stone-500 dark:text-stone-400',
};

function Rated({ label, value, metric, rawValue, suffix = '' }) {
  const rating = rateMetric(metric, rawValue);
  return (
    <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-5 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-stone-600 dark:text-stone-300">{label}</span>
        <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
          {value === null ? '—' : `${value}${suffix}`}
        </span>
      </div>
      {metric !== 'none' && (
        <p className={`mt-1 text-xs font-semibold ${RATING_CLASS[rating]}`}>{RATING_TEXT[rating]}</p>
      )}
    </div>
  );
}

export function SaasRetention() {
  const [v, setV] = useState({
    startMrr: '100000', expansionMrr: '15000', contractionMrr: '5000', churnedMrr: '10000',
    startCustomers: '400', churnedCustomers: '40',
    acquisitionSpend: '1200000', newCustomers: '200', arpaMonthly: '2000', grossMarginPct: '80',
  });
  const set = (key) => (value) => setV(prev => ({ ...prev, [key]: value }));
  const r = computeSaasRetention(v);
  const fmt = (n, digits = 1) => (n === null ? null : Number(n.toFixed(digits)).toLocaleString('en-IN'));

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">Revenue over the last 12 months</h3>
          <Field label="Starting MRR (monthly recurring revenue)" value={v.startMrr} onChange={set('startMrr')} />
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Expansion MRR" value={v.expansionMrr} onChange={set('expansionMrr')} />
            <Field label="Downgrade MRR" value={v.contractionMrr} onChange={set('contractionMrr')} />
            <Field label="Churned MRR" value={v.churnedMrr} onChange={set('churnedMrr')} />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">Customers and acquisition</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Customers at the start" value={v.startCustomers} onChange={set('startCustomers')} />
            <Field label="Customers who churned" value={v.churnedCustomers} onChange={set('churnedCustomers')} />
            <Field label="Spend on acquisition (12 months)" value={v.acquisitionSpend} onChange={set('acquisitionSpend')} />
            <Field label="New customers acquired" value={v.newCustomers} onChange={set('newCustomers')} />
            <Field label="Average monthly revenue per customer" value={v.arpaMonthly} onChange={set('arpaMonthly')} />
            <Field label="Gross margin (%)" value={v.grossMarginPct} onChange={set('grossMarginPct')} />
          </div>
        </section>
      </div>

      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {r.warnings.map(w => (
          <p key={w} className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">{w}</p>
        ))}
        <Rated label="Net revenue retention" metric="nrr" rawValue={r.nrr} value={fmt(r.nrr)} suffix="%" />
        <Rated label="Gross revenue retention" metric="grr" rawValue={r.grr} value={fmt(r.grr)} suffix="%" />
        <Rated label="Logo churn (12 months)" metric="none" rawValue={null} value={fmt(r.logoChurnPct)} suffix="%" />
        <Rated label="Customer acquisition cost" metric="none" rawValue={null} value={r.cac === null ? null : money(r.cac)} />
        <Rated label="Customer lifetime value" metric="none" rawValue={null} value={r.ltv === null ? null : money(r.ltv)} />
        <Rated label="LTV to CAC" metric="ltvToCac" rawValue={r.ltvToCac} value={fmt(r.ltvToCac)} suffix="x" />
        <Rated label="CAC payback" metric="paybackMonths" rawValue={r.paybackMonths} value={fmt(r.paybackMonths)} suffix=" months" />
        <p className="px-1 text-xs leading-5 text-stone-600 dark:text-stone-300">
          Ratings use rough rules of thumb, not targets. Good figures vary by customer size, sales model and stage. LTV needs some churn to be finite, so it shows “—” when churn is zero.
        </p>
      </div>
    </div>
  );
}

