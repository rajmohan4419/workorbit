import { indiaTax, INDIA_TAX_PERIODS, TAX_VERIFIED_ON } from '../../lib/tax/india.js';
import { useMemo, useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { useToolShareContext } from '../../lib/shareResults';

const num = value => Number.isFinite(Number(value)) ? Math.max(0,Number(value)) : 0;
const money = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, value));

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <input type="number" min="0" value={value} onChange={e => onChange(e.target.value)} className="orbit-control mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 outline-none focus:border-accent-500" />
    </label>
  );
}

function Result({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${highlight ? 'border-accent-500/40 bg-accent-950/20' : 'border-slate-800 bg-slate-950'}`}>
      <span className="text-xs text-slate-400">{label}</span>
      <strong className={highlight ? 'text-lg text-accent-300' : 'text-sm text-white'}>{value}</strong>
    </div>
  );
}

export default function IndiaIncomeTaxCalculator() {
  const { updateSharePayload, openShareModal } = useToolShareContext();

  // URL state restoration on mount
  const [income, setIncome] = useState(() => {
    if (typeof window === 'undefined') return '1500000';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('income') || '1500000';
  });
  const [deductions, setDeductions] = useState(() => {
    if (typeof window === 'undefined') return '0';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('deductions') || '0';
  });
  const [regime, setRegime] = useState(() => {
    if (typeof window === 'undefined') return 'new';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('regime') || 'new';
  });
  const [ageBand, setAgeBand] = useState(() => {
    if (typeof window === 'undefined') return 'below60';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('ageBand') || 'below60';
  });
  const [incomeType, setIncomeType] = useState(() => {
    if (typeof window === 'undefined') return 'salary';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('incomeType') || 'salary';
  });
  const [period, setPeriod] = useState(() => { const value = new URLSearchParams(window.location.search).get('period'); return INDIA_TAX_PERIODS[value] ? value : 'ay2026-27'; });
  const [resident, setResident] = useState(() => new URLSearchParams(window.location.search).get('resident') !== 'false');

  // Sync to URL state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set('income', income);
      sp.set('deductions', deductions);
      sp.set('regime', regime);
      sp.set('ageBand', ageBand);
      sp.set('incomeType', incomeType);
      sp.set('period', period);
      sp.set('resident', String(resident));
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
    } catch {
      // ignore
    }
  }, [income, deductions, regime, ageBand, incomeType, period, resident]);

  const result = useMemo(() => {
    const gross = num(income);
    const standardDeduction = incomeType === 'salary' ? Math.min(regime === 'new' ? 75000 : 50000, gross) : 0;
    const taxable = Math.max(0, gross - standardDeduction - (regime === 'old' ? num(deductions) : 0));
    const taxes = indiaTax(taxable, { regime, ageBand, resident, period });
    return {gross,standardDeduction,taxable,...taxes,monthly:taxes.total/12};
  }, [income, deductions, regime, ageBand, incomeType, resident, period]);

  // Live Result Share Context Registration
  useEffect(() => {
    const effectiveRate = ((result.total / (result.gross || 1)) * 100).toFixed(1);
    updateSharePayload({
      headlineMetric: `₹ ${money(result.total)} Income Tax`,
      subMetrics: [
        { label: 'Taxable Income', value: `₹ ${money(result.taxable)}` },
        { label: 'Tax Regime', value: `${regime === 'new' ? 'New' : 'Old'} · ${INDIA_TAX_PERIODS[period].label}` },
        { label: 'Effective Rate', value: `${effectiveRate}%` },
      ],
      summaryText: `Estimated total tax of ₹ ${money(result.total)} on ₹ ${money(result.gross)} under ${regime} regime (${effectiveRate}% effective)`,
      queryParams: { income, deductions, regime, ageBand, incomeType, period, resident },
    });
  }, [result, income, deductions, regime, ageBand, incomeType, period, resident, updateSharePayload]);

  return (
    <div className="space-y-5">
      <label className="block text-sm">Income period
        <select aria-label="Income period" className="orbit-control w-full" value={period} onChange={e=>setPeriod(e.target.value)}>{Object.entries(INDIA_TAX_PERIODS).map(([key,rule])=><option key={key} value={key}>{rule.label}</option>)}</select>
      </label>
      <p className="text-xs">Income-tax Act, {INDIA_TAX_PERIODS[period].act}. Rebate section {INDIA_TAX_PERIODS[period].rebateSection}. <a href={INDIA_TAX_PERIODS[period].source} target="_blank" rel="noreferrer">Official rules</a> · verified {TAX_VERIFIED_ON}.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Annual gross income (₹)" value={income} onChange={setIncome} />
        <Field label="Additional deductions (₹)" value={deductions} onChange={setDeductions} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Income type</span>
          <select value={incomeType} onChange={e => setIncomeType(e.target.value)} className="orbit-control mt-2 w-full rounded-xl border border-slate-800 bg-slate-950">
            <option value="salary">Salary</option>
            <option value="other">Other income</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Tax regime</span>
          <select value={regime} onChange={e => setRegime(e.target.value)} className="orbit-control mt-2 w-full rounded-xl border border-slate-800 bg-slate-950">
            <option value="new">New regime</option>
            <option value="old">Old regime</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Age band</span>
          <select value={ageBand} onChange={e => setAgeBand(e.target.value)} className="orbit-control mt-2 w-full rounded-xl border border-slate-800 bg-slate-950">
            <option value="below60">Below 60</option>
            <option value="senior">60 to 79</option>
            <option value="super">80+</option>
          </select>
        </label>
      </div>

      <label className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-slate-200">Resident individual</span>
          <span className="block mt-1 text-[11px] text-slate-500">Used for the ordinary-income rebate eligibility check.</span>
        </span>
        <input type="checkbox" checked={resident} onChange={e => setResident(e.target.checked)} />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <Result label="Estimated annual income tax" value={`₹ ${money(result.total)}`} highlight />
        <Result label="Estimated monthly tax" value={`₹ ${money(result.monthly)}`} />
        <Result label="Taxable income used" value={`₹ ${money(result.taxable)}`} />
        <Result label="Rebate including marginal relief" value={`₹ ${money(result.rebate)}`} />
        <Result label="Surcharge" value={`₹ ${money(result.surcharge)}`} />
        <Result label="Health & education cess" value={`₹ ${money(result.cess)}`} />
      </div>

      <button
        type="button"
        onClick={() => openShareModal()}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--orbit-border)] bg-slate-900 hover:bg-slate-850 text-xs sm:text-sm font-semibold text-slate-100 hover:text-accent-400 hover:border-accent-500/40 transition shadow-sm cursor-pointer active:scale-[0.98]"
      >
        <Share2 size={15} className="text-accent-400" />
        <span>Share Tax Result Scorecard</span>
      </button>

      <p className="text-xs text-slate-500">Uses the selected period’s individual slabs. Ordinary salary and other slab-rate income only. Salary income gets a ₹75,000 standard deduction in the new regime or ₹50,000 in the old regime; additional deductions apply in the old regime only. Eligible employer NPS deductions in the new regime are not modelled. Capital gains, special-rate income, detailed exemptions, payroll PF and every possible rebate/relief are not modelled.</p>
    </div>
  );
}
