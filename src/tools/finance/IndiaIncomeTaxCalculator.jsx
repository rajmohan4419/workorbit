import { useMemo, useState } from 'react';

const num = value => Math.max(0, Number(value) || 0);
const money = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, value));

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <input type="number" min="0" value={value} onChange={e => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500" />
    </label>
  );
}

function Result({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${highlight ? 'border-violet-500/40 bg-violet-950/20' : 'border-slate-800 bg-slate-950'}`}>
      <span className="text-xs text-slate-400">{label}</span>
      <strong className={highlight ? 'text-lg text-violet-300' : 'text-sm text-white'}>{value}</strong>
    </div>
  );
}

function newRegimeTax(taxable) {
  const slabs = [[400000, 0], [400000, .05], [400000, .10], [400000, .15], [400000, .20], [400000, .25], [Infinity, .30]];
  let remaining = taxable;
  let tax = 0;
  for (const [limit, rate] of slabs) {
    const amount = Math.min(remaining, limit);
    if (amount <= 0) break;
    tax += amount * rate;
    remaining -= amount;
  }
  return tax;
}

function oldRegimeTax(taxable, senior = false) {
  const firstThreshold = senior === 'super' ? 500000 : senior === 'senior' ? 300000 : 250000;
  const slabs = senior === 'super'
    ? [[500000, 0], [1000000, .20], [Infinity, .30]]
    : [[firstThreshold, 0], [500000, .05], [1000000, .20], [Infinity, .30]];
  let remaining = taxable;
  let tax = 0;
  let previous = 0;
  for (const [limit, rate] of slabs) {
    const width = Math.max(0, limit - previous);
    const amount = Math.min(remaining, width);
    if (amount <= 0) break;
    tax += amount * rate;
    remaining -= amount;
    previous = limit;
  }
  if (taxable <= 500000) tax = Math.max(0, tax - 12500);
  return tax;
}

export default function IndiaIncomeTaxCalculator() {
  const [income, setIncome] = useState('1500000');
  const [deductions, setDeductions] = useState('0');
  const [regime, setRegime] = useState('new');
  const [ageBand, setAgeBand] = useState('below60');
  const [incomeType, setIncomeType] = useState('salary');
  const [resident, setResident] = useState(true);

  const result = useMemo(() => {
    const gross = num(income);
    const standardDeduction = incomeType === 'salary' ? Math.min(regime === 'new' ? 75000 : 50000, gross) : 0;
    const taxable = Math.max(0, gross - standardDeduction - num(deductions));
    let baseTax = regime === 'new' ? newRegimeTax(taxable) : oldRegimeTax(taxable, ageBand);
    let rebate = 0;

    if (resident && regime === 'new' && taxable <= 1200000) rebate = Math.min(baseTax, 60000);
    if (resident && regime === 'old' && taxable <= 500000) rebate = Math.min(baseTax, 12500);

    const taxAfterRebate = Math.max(0, baseTax - rebate);
    const surchargeRate = regime === 'new'
      ? taxable > 20000000 ? .25 : taxable > 10000000 ? .15 : taxable > 5000000 ? .10 : 0
      : taxable > 50000000 ? .37 : taxable > 20000000 ? .25 : taxable > 10000000 ? .15 : taxable > 5000000 ? .10 : 0;
    const surcharge = taxAfterRebate * surchargeRate;
    const cess = (taxAfterRebate + surcharge) * .04;
    const total = taxAfterRebate + surcharge + cess;

    return { gross, standardDeduction, taxable, baseTax, rebate, surcharge, cess, total, monthly: total / 12 };
  }, [income, deductions, regime, ageBand, incomeType, resident]);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Annual gross income (₹)" value={income} onChange={setIncome} />
        <Field label="Additional deductions (₹)" value={deductions} onChange={setDeductions} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Income type</span>
          <select value={incomeType} onChange={e => setIncomeType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            <option value="salary">Salary</option>
            <option value="other">Other income</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Tax regime</span>
          <select value={regime} onChange={e => setRegime(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            <option value="new">New regime</option>
            <option value="old">Old regime</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Age band</span>
          <select value={ageBand} onChange={e => setAgeBand(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            <option value="below60">Below 60</option>
            <option value="senior">60 to 79</option>
            <option value="super">80+</option>
          </select>
        </label>
      </div>

      <label className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-slate-200">Resident individual</span>
          <span className="block mt-1 text-[11px] text-slate-500">Used for the Section 87A rebate eligibility check.</span>
        </span>
        <input type="checkbox" checked={resident} onChange={e => setResident(e.target.checked)} />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <Result label="Estimated annual income tax" value={`₹ ${money(result.total)}`} highlight />
        <Result label="Estimated monthly tax" value={`₹ ${money(result.monthly)}`} />
        <Result label="Taxable income used" value={`₹ ${money(result.taxable)}`} />
        <Result label="Section 87A rebate" value={`₹ ${money(result.rebate)}`} />
        <Result label="Surcharge" value={`₹ ${money(result.surcharge)}`} />
        <Result label="Health & education cess" value={`₹ ${money(result.cess)}`} />
      </div>

      <p className="text-xs text-slate-500">Uses AY 2026-27 individual slabs and a simplified calculation. Salary income gets a ₹75,000 standard deduction in the new regime or ₹50,000 in the old regime; enter only additional deductions here. Capital gains, special-rate income, detailed exemptions, payroll PF and every possible rebate/relief are not modelled.</p>
    </div>
  );
}
