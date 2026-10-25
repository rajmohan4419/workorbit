import { useState } from 'react';
import { Field } from '../../components/tools/ToolFields';
import { ImportPanel } from '../../components/tools/ImportPanel';
import { mapColumns, toCsv } from '../../lib/csv';
import { downloadBlob } from '../../lib/toolFormat';
import { RETENTION_ALIASES, retentionFromCustomers } from './retentionCustomers';
import { DEAL_ALIASES, aggregateDeals } from './deals';

const RETENTION_TEMPLATE = [
  ['Customer', 'Start MRR', 'End MRR'],
  ['Acme Pvt Ltd', '50000', '62000'],
  ['Beta Traders', '20000', '0'],
  ['Gamma Labs', '0', '15000'],
];

const PIPELINE_TEMPLATE = [
  ['Deal', 'Stage', 'Value', 'Win rate (%)'],
  ['Acme renewal', 'Negotiation', '40000', '75'],
  ['Beta pilot', 'Lead', '5000', ''],
  ['Gamma proposal', 'Proposal', '25000', '50'],
];
import { money } from '../../lib/toolFormat';
import { computeSaasRetention, rateMetric } from './saasRetention';
import { computePipeline } from './salesPipeline';
import { computeSaasPricing } from './saasPricing';

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
  const [importNote, setImportNote] = useState(null);
  const set = (key) => (value) => setV(prev => ({ ...prev, [key]: value }));
  const r = computeSaasRetention(v);
  const fmt = (n, digits = 1) => (n === null ? null : Number(n.toFixed(digits)).toLocaleString('en-IN'));

  const handleImport = ({ headers, records }) => {
    const map = mapColumns(headers, RETENTION_ALIASES);
    if (!map.startMrr || !map.endMrr) {
      setImportNote({ type: 'error', text: 'Expected a start MRR and an end MRR column for each customer. Use the template.' });
      return;
    }
    const rows = records.map(rec => ({
      customer: map.customer ? rec[map.customer] : '',
      startMrr: rec[map.startMrr],
      endMrr: rec[map.endMrr],
    }));
    const { totals, warnings } = retentionFromCustomers(rows);
    setV(prev => ({
      ...prev,
      startMrr: String(totals.startMrr),
      expansionMrr: String(totals.expansionMrr),
      contractionMrr: String(totals.contractionMrr),
      churnedMrr: String(totals.churnedMrr),
      startCustomers: String(totals.startCustomers),
      churnedCustomers: String(totals.churnedCustomers),
      newCustomers: String(totals.newCustomers),
    }));
    setImportNote({
      type: warnings.length ? 'info' : 'ok',
      text: `Loaded ${rows.length} customer(s). ${totals.newCustomers} new in the period are excluded from retention.${warnings.length ? ` ${warnings.length} row(s) skipped: ${warnings.slice(0, 3).join(' ')}` : ''}`,
    });
  };

  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Net revenue retention (%)', r.nrr === null ? '' : r.nrr.toFixed(2)],
      ['Gross revenue retention (%)', r.grr === null ? '' : r.grr.toFixed(2)],
      ['Logo churn (%)', r.logoChurnPct === null ? '' : r.logoChurnPct.toFixed(2)],
      ['Customer acquisition cost', r.cac === null ? '' : r.cac.toFixed(2)],
      ['Customer lifetime value', r.ltv === null ? '' : r.ltv.toFixed(2)],
      ['LTV to CAC (x)', r.ltvToCac === null ? '' : r.ltvToCac.toFixed(2)],
      ['CAC payback (months)', r.paybackMonths === null ? '' : r.paybackMonths.toFixed(2)],
    ];
    downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), 'saas-retention-results.csv');
  };

  return (
    <div className="space-y-6">
      <ImportPanel
        title="Import customers from a CSV"
        templateName="retention-customers-template.csv"
        templateRows={RETENTION_TEMPLATE}
        onParsed={handleImport}
      />
      {importNote && (
        <p role="status" className={`text-xs font-medium ${importNote.type === 'error' ? 'text-rose-700 dark:text-rose-300' : importNote.type === 'info' ? 'text-amber-800 dark:text-amber-300' : 'text-accent-700 dark:text-accent-300'}`}>{importNote.text}</p>
      )}
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
          <button type="button" onClick={exportCsv}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
            Download results (CSV)
          </button>
          <p className="px-1 text-xs leading-5 text-stone-600 dark:text-stone-300">
            Ratings use rough rules of thumb, not targets. LTV needs some churn to be finite, so it shows “—” when churn is zero.
          </p>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_STAGES = [
  { name: 'Lead', deals: '20', avgValue: '5000', winRatePct: '10' },
  { name: 'Qualified', deals: '10', avgValue: '12000', winRatePct: '25' },
  { name: 'Proposal', deals: '5', avgValue: '25000', winRatePct: '50' },
  { name: 'Negotiation', deals: '2', avgValue: '40000', winRatePct: '75' },
];

export function SalesPipelineForecaster() {
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [quota, setQuota] = useState('200000');
  const [importNote, setImportNote] = useState(null);
  const updateStage = (index, key, value) =>
    setStages(prev => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));

  const handleImport = ({ headers, records }) => {
    const map = mapColumns(headers, DEAL_ALIASES);
    if (!map.stage || !map.value) {
      setImportNote({ type: 'error', text: 'Expected a Stage and a Value column for each deal. Use the template.' });
      return;
    }
    const deals = records.map((rec, i) => ({
      name: map.name ? rec[map.name] : `Row ${i + 1}`,
      stage: rec[map.stage],
      value: rec[map.value],
      winRate: map.winRate ? rec[map.winRate] : '',
    }));
    const defaultRates = Object.fromEntries(stages.map(s => [s.name, Number(s.winRatePct) || 0]));
    const { stages: summary, warnings } = aggregateDeals({
      deals,
      stageNames: stages.map(s => s.name),
      defaultRates,
    });
    setStages(prev => prev.map(s => ({
      ...s,
      deals: String(summary[s.name].deals),
      avgValue: String(Math.round(summary[s.name].avgValue)),
      winRatePct: String(Number(summary[s.name].winRatePct.toFixed(2))),
    })));
    setImportNote({
      type: warnings.length ? 'info' : 'ok',
      text: `Loaded ${deals.length} deal(s).${warnings.length ? ` ${warnings.length} row(s) skipped: ${warnings.slice(0, 3).join(' ')}` : ''}`,
    });
  };

  const r = computePipeline({ stages, quota });
  const fmt1 = (n) => (n === null ? null : Number(n.toFixed(1)).toLocaleString('en-IN'));

  const exportCsv = () => {
    const rows = [['Stage', 'Open deals', 'Average deal value', 'Win rate (%)', 'Weighted value']];
    r.perStage.forEach((p, i) => {
      const s = stages[i];
      rows.push([p.name, s.deals, Number(s.avgValue) || 0, Number(s.winRatePct) || 0, p.weighted.toFixed(2)]);
    });
    rows.push(['Total weighted', '', '', '', r.weightedValue.toFixed(2)]);
    rows.push(['Quota', '', '', '', Number(quota) || 0]);
    rows.push(['Gap to target', '', '', '', r.gap === null ? '' : r.gap.toFixed(2)]);
    downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), 'sales-pipeline-results.csv');
  };

  return (
    <div className="space-y-6">
      <ImportPanel
        title="Import deals from a CSV"
        templateName="pipeline-deals-template.csv"
        templateRows={PIPELINE_TEMPLATE}
        onParsed={handleImport}
      />
      {importNote && (
        <p role="status" className={`text-xs font-medium ${importNote.type === 'error' ? 'text-rose-700 dark:text-rose-300' : importNote.type === 'info' ? 'text-amber-800 dark:text-amber-300' : 'text-accent-700 dark:text-accent-300'}`}>{importNote.text}</p>
      )}
      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-7 space-y-5">
          {stages.map((stage, i) => (
            <section key={stage.name} className="rounded-2xl border border-[var(--orbit-border)] p-4 space-y-3">
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">{stage.name}</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Open deals" value={stage.deals} onChange={v => updateStage(i, 'deals', v)} />
                <Field label="Average deal value" value={stage.avgValue} onChange={v => updateStage(i, 'avgValue', v)} />
                <Field label="Win rate (%)" value={stage.winRatePct} onChange={v => updateStage(i, 'winRatePct', v)} />
              </div>
            </section>
          ))}
          <Field label="Sales target (quota) for the period" value={quota} onChange={setQuota} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
          <Rated label="Weighted pipeline" metric="none" rawValue={null} value={money(r.weightedValue)} />
          <Rated label="Total pipeline" metric="none" rawValue={null} value={money(r.totalValue)} />
          <Rated label="Pipeline coverage" metric="coverage" rawValue={r.coverage} value={fmt1(r.coverage)} suffix="x" />
          <Rated label="Expected deals won" metric="none" rawValue={null} value={fmt1(r.expectedDeals)} />
          <Rated label="Gap to target" metric="none" rawValue={null} value={r.gap === null ? null : money(r.gap)} />
          <button type="button" onClick={exportCsv}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
            Download results (CSV)
          </button>
          <p className="px-1 text-xs leading-5 text-stone-600 dark:text-stone-300">
            Many sales teams aim for about 3x coverage of their target in open pipeline. Win rates are your own estimates, so treat results as a planning guide.
          </p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ title, model, count }) {
  return (
    <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-5 py-4 space-y-2">
      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</h4>
      <div className="flex justify-between text-sm text-stone-600 dark:text-stone-300"><span>Monthly per customer</span><span className="font-semibold text-stone-900 dark:text-stone-100">{money(model.monthly)}</span></div>
      <div className="flex justify-between text-sm text-stone-600 dark:text-stone-300"><span>Annual per customer</span><span className="font-semibold text-stone-900 dark:text-stone-100">{money(model.annual)}</span></div>
      <div className="flex justify-between text-sm text-stone-600 dark:text-stone-300"><span>MRR for {count} customers</span><span className="font-semibold text-stone-900 dark:text-stone-100">{money(model.mrr)}</span></div>
    </div>
  );
}

export function SaasPricing() {
  const [v, setV] = useState({
    seats: '25', customers: '100', perSeatPrice: '800', flatPrice: '15000',
    tier1Seats: '10', tier1Price: '1000', tier2Price: '600',
    usageUnits: '150000', includedUnits: '50000', usagePer1000: '20',
    annualDiscountPct: '10',
  });
  const set = (key) => (value) => setV(prev => ({ ...prev, [key]: value }));
  const r = computeSaasPricing(v);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-6 space-y-5">
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">Typical customer</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Seats per customer" value={v.seats} onChange={set('seats')} />
            <Field label="Customers" value={v.customers} onChange={set('customers')} />
            <Field label="Annual discount (%)" value={v.annualDiscountPct} onChange={set('annualDiscountPct')} />
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">Per seat and flat</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Price per seat per month" value={v.perSeatPrice} onChange={set('perSeatPrice')} />
            <Field label="Flat plan price per month" value={v.flatPrice} onChange={set('flatPrice')} />
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">Volume tiers</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Seats in tier one" value={v.tier1Seats} onChange={set('tier1Seats')} />
            <Field label="Tier one price per seat" value={v.tier1Price} onChange={set('tier1Price')} />
            <Field label="Later seats price" value={v.tier2Price} onChange={set('tier2Price')} />
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">Usage</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Units used per month" value={v.usageUnits} onChange={set('usageUnits')} />
            <Field label="Included units" value={v.includedUnits} onChange={set('includedUnits')} />
            <Field label="Price per 1,000 units" value={v.usagePer1000} onChange={set('usagePer1000')} />
          </div>
        </section>
      </div>

      <div className="lg:col-span-6 space-y-3">
        <PricingCard title="Per seat" model={r.perSeat} count={v.customers} />
        <PricingCard title="Flat plan" model={r.flat} count={v.customers} />
        <PricingCard title="Volume tiers" model={r.tiered} count={v.customers} />
        <PricingCard title="Usage based" model={r.usage} count={v.customers} />
        <p className="px-1 text-xs leading-5 text-stone-600 dark:text-stone-300">
          Figures are for one typical customer profile. Compare the models by the revenue each gives you and how they feel to the buyer. Annual prices include the discount you enter.
        </p>
      </div>
    </div>
  );
}
