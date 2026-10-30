import { useState, useMemo } from 'react';
import { Field, Result } from '../../components/tools/ToolFields';
import { money, num } from '../../lib/toolFormat';

function calculateNewTax(taxable) {
  const slabs = [[400000, 0], [400000, .05], [400000, .10], [400000, .15], [400000, .20], [400000, .25], [Infinity, .30]];
  let remaining = taxable, tax = 0;
  for (const [limit, rate] of slabs) { const amount = Math.min(remaining, limit); if (amount <= 0) break; tax += amount * rate; remaining -= amount; }
  if (taxable <= 1200000) tax = Math.max(0, tax - 60000);
  return tax * 1.04;
}

function calculateOldTax(taxable) {
  const slabs = [[250000, 0], [250000, .05], [500000, .20], [Infinity, .30]];
  let remaining = taxable, tax = 0;
  for (const [limit, rate] of slabs) { const amount = Math.min(remaining, limit); if (amount <= 0) break; tax += amount * rate; remaining -= amount; }
  if (taxable <= 500000) tax = Math.max(0, tax - 12500);
  return tax * 1.04;
}

export function SalaryCalculator() {
  const [ctc, setCtc] = useState('1000000');
  const [basicPct, setBasicPct] = useState('40');
  const [variable, setVariable] = useState('0');
  const [gratuity, setGratuity] = useState('0');
  const [pfCap, setPfCap] = useState(true);
  const [regime, setRegime] = useState('new');
  const [state, setState] = useState('Karnataka');

  const result = useMemo(() => {
    const annualCtc = num(ctc), basic = annualCtc * num(basicPct) / 100;
    const monthlyBasic = basic / 12;
    const employeePf = pfCap ? Math.min(monthlyBasic, 15000) * .12 * 12 : basic * .12;
    const employerPf = employeePf;
    const annualGratuity = num(gratuity);
    const annualVariable = num(variable);
    const grossCash = Math.max(0, annualCtc - employerPf - annualGratuity);
    const fixedGross = Math.max(0, grossCash - annualVariable);
    const standardDeduction = regime === 'new' ? 75000 : 50000;
    const taxable = Math.max(0, fixedGross - standardDeduction);
    const incomeTax = regime === 'new' ? calculateNewTax(taxable) : calculateOldTax(taxable);
    const pt = state === 'Karnataka' && fixedGross / 12 >= 25000 ? 2500 : 0;
    const annualTakeHome = Math.max(0, fixedGross - employeePf - incomeTax - pt);
    return { annualCtc, basic, employeePf, employerPf, annualGratuity, annualVariable, fixedGross, taxable, incomeTax, pt, annualTakeHome, monthlyTakeHome: annualTakeHome / 12 };
  }, [ctc, basicPct, variable, gratuity, pfCap, regime, state]);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Salary & Deduction Inputs</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Annual CTC (₹)" value={ctc} onChange={setCtc} />
          <Field label="Basic salary as % of CTC" value={basicPct} onChange={setBasicPct} />
          <Field label="Annual variable pay included (₹)" value={variable} onChange={setVariable} />
          <Field label="Annual gratuity included (₹)" value={gratuity} onChange={setGratuity} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
            <span>
              <span className="block text-xs font-semibold text-stone-800 dark:text-stone-200">EPF calculation</span>
              <span className="block text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Cap employee PF at ₹1,800/month</span>
            </span>
            <input type="checkbox" checked={pfCap} onChange={e => setPfCap(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Tax regime</span>
            <select value={regime} onChange={e => setRegime(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 min-h-[44px]">
              <option value="new">New regime (default)</option>
              <option value="old">Old regime</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Professional tax state</span>
          <select value={state} onChange={e => setState(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 min-h-[44px]">
            <option>Karnataka</option>
            <option value="none">Other / calculate separately</option>
          </select>
        </label>
      </div>

      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">Take-Home Summary</h3>
        <div className="space-y-3">
          <Result label="Estimated monthly take-home" value={`₹ ${money(result.monthlyTakeHome)}`} highlight />
          <Result label="Estimated annual take-home" value={`₹ ${money(result.annualTakeHome)}`} highlight />
          <Result label="Annual income tax + cess" value={`₹ ${money(result.incomeTax)}`} />
          <Result label="Employee EPF" value={`₹ ${money(result.employeePf)}`} />
          <Result label="Employer EPF included in CTC" value={`₹ ${money(result.employerPf)}`} />
          <Result label="Professional tax" value={`₹ ${money(result.pt)}`} />
        </div>
        <div className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 text-xs text-stone-600 dark:text-stone-400 space-y-2">
          <div className="flex justify-between"><span>Gross cash salary before deductions</span><span className="font-semibold text-stone-900 dark:text-stone-100">₹ {money(result.fixedGross)}</span></div>
          <div className="flex justify-between"><span>Standard deduction</span><span className="font-semibold text-stone-900 dark:text-stone-100">₹ {money(regime === 'new' ? 75000 : 50000)}</span></div>
          <div className="flex justify-between"><span>Taxable salary used</span><span className="font-semibold text-stone-900 dark:text-stone-100">₹ {money(result.taxable)}</span></div>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">Estimate only. Actual payslips can differ based on PF structure, tax declarations, and employer policy.</p>
      </div>
    </div>
  );
}

export function SalaryHike() {
  const [old, setOld] = useState('1000000');
  const [next, setNext] = useState('1200000');
  const o = num(old), n = num(next), h = o ? ((n - o) / o) * 100 : 0;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Current annual salary (₹)" value={old} onChange={setOld} />
        <Field label="New annual salary (₹)" value={next} onChange={setNext} />
      </div>
      <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20 h-fit">
        <Result label="Percentage Hike" value={`${h.toFixed(2)}%`} highlight />
        <Result label="Absolute Increase" value={`₹ ${money(n - o)} / year`} />
        <Result label="Monthly Increase" value={`₹ ${money((n - o) / 12)} / month`} />
      </div>
    </div>
  );
}

export function Offer() {
  const [a, setA] = useState('1000000');
  const [b, setB] = useState('1300000');
  const [basicPct, setBasicPct] = useState('40');
  const [variableA, setVariableA] = useState('0');
  const [variableB, setVariableB] = useState('0');
  const [regime, setRegime] = useState('new');

  const calculateTakeHome = (ctc, variable) => {
    const annual = num(ctc), basic = annual * num(basicPct) / 100, monthlyBasic = basic / 12;
    const employeePf = Math.min(monthlyBasic, 15000) * .12 * 12;
    const employerPf = employeePf, fixedGross = Math.max(0, annual - employerPf - num(variable));
    const standardDeduction = regime === 'new' ? 75000 : 50000;
    const taxable = Math.max(0, fixedGross - standardDeduction);
    const tax = regime === 'new' ? calculateNewTax(taxable) : calculateOldTax(taxable);
    const pt = fixedGross / 12 >= 25000 ? 2500 : 0;
    const annualTakeHome = Math.max(0, fixedGross - employeePf - tax - pt);
    return { annualTakeHome, monthlyTakeHome: annualTakeHome / 12 };
  };

  const first = calculateTakeHome(a, variableA), second = calculateTakeHome(b, variableB);
  const ctcDiff = num(b) - num(a), takeHomeDiff = second.annualTakeHome - first.annualTakeHome;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 space-y-3">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Offer A</p>
            <Field label="Annual CTC (₹)" value={a} onChange={setA} />
            <Field label="Variable pay (₹)" value={variableA} onChange={setVariableA} />
          </div>
          <div className="rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 space-y-3">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Offer B</p>
            <Field label="Annual CTC (₹)" value={b} onChange={setB} />
            <Field label="Variable pay (₹)" value={variableB} onChange={setVariableB} />
          </div>
        </div>
        <Field label="Basic salary as % of CTC" value={basicPct} onChange={setBasicPct} />
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Tax regime</span>
          <select value={regime} onChange={e => setRegime(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 min-h-[44px]">
            <option value="new">New regime</option>
            <option value="old">Old regime</option>
          </select>
        </label>
      </div>

      <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20 h-fit">
        <Result label="Offer A monthly take-home" value={`₹ ${money(first.monthlyTakeHome)}`} highlight />
        <Result label="Offer B monthly take-home" value={`₹ ${money(second.monthlyTakeHome)}`} highlight />
        <Result label="CTC difference" value={`₹ ${money(ctcDiff)} / year`} />
        <Result label="Take-home difference / month" value={`₹ ${money(takeHomeDiff / 12)}`} highlight />
      </div>
    </div>
  );
}

export function Notice() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState('60');
  const d = new Date(date);
  const valid = !Number.isNaN(d.getTime());
  if (valid) d.setDate(d.getDate() + num(days));

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Resignation date" value={date} onChange={setDate} type="date" />
        <Field label="Notice period (days)" value={days} onChange={setDays} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {valid ? (
          <Result label="Calculated last working date" value={d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} highlight />
        ) : (
          <p className="text-sm text-red-400">Enter a valid resignation date.</p>
        )}
      </div>
    </div>
  );
}

export function Experience() {
  const [from, setFrom] = useState('2012-01-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const start = new Date(from), end = new Date(to);
  const valid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
  const d = valid ? (end - start) / 86400000 : 0;
  const years = Math.floor(d / 365.2425), months = Math.floor((d - years * 365.2425) / 30.44);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Start date" value={from} onChange={setFrom} type="date" />
        <Field label="End date" value={to} onChange={setTo} type="date" />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {valid ? (
          <Result label="Total Experience" value={`${years} years ${months} months`} highlight />
        ) : (
          <p className="text-sm text-red-400">Choose an end date on or after the start date.</p>
        )}
      </div>
    </div>
  );
}
