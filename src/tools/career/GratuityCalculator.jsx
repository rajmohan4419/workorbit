import { useMemo, useState } from 'react';

const num = value => Math.max(0, Number(value) || 0);
const money = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

function Field({ label, value, onChange, type = 'number', min = 0, step = '1' }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500"
      />
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

export default function GratuityCalculator() {
  const [basic, setBasic] = useState('40000');
  const [da, setDa] = useState('0');
  const [years, setYears] = useState('5');
  const [months, setMonths] = useState('0');
  const [fixedTerm, setFixedTerm] = useState(false);

  const result = useMemo(() => {
    const lastDrawnWage = num(basic) + num(da);
    const completedYears = Math.max(0, Math.floor(num(years)));
    const extraMonths = Math.max(0, Math.min(11, Math.floor(num(months))));
    const countedYears = completedYears + (extraMonths > 6 ? 1 : 0);
    const gratuity = lastDrawnWage * 15 / 26 * countedYears;
    const eligible = fixedTerm ? completedYears >= 1 : completedYears >= 5;
    return { lastDrawnWage, countedYears, gratuity, eligible };
  }, [basic, da, years, months, fixedTerm]);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Last drawn basic salary / wage (₹ per month)" value={basic} onChange={setBasic} />
        <Field label="Dearness allowance included in wages (₹ per month)" value={da} onChange={setDa} />
        <Field label="Completed years of service" value={years} onChange={setYears} />
        <Field label="Additional months" value={months} onChange={setMonths} min="0" max="11" />
      </div>

      <label className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-slate-200">Fixed-term employee</span>
          <span className="block mt-1 text-[11px] text-slate-500">Uses the one-year service rule for a fixed-term contract ending after the required service period.</span>
        </span>
        <input type="checkbox" checked={fixedTerm} onChange={e => setFixedTerm(e.target.checked)} />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <Result label="Estimated gratuity" value={`₹ ${money(result.gratuity)}`} highlight />
        <Result label="Service years counted" value={String(result.countedYears)} />
        <Result label="Wage used in formula" value={`₹ ${money(result.lastDrawnWage)} / month`} />
        <Result label="Eligibility check" value={result.eligible ? 'Meets calculator rule' : 'Below calculator rule'} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 space-y-2">
        <p><strong className="text-slate-200">Formula:</strong> last drawn wages × 15 ÷ 26 × eligible years of service.</p>
        <p>For ordinary cases, the traditional rule uses five years of continuous service. The Code on Social Security also provides a one-year gratuity rule for eligible fixed-term employees. Actual entitlement can depend on employment status, applicable law, wages and the employer's gratuity terms.</p>
      </div>
    </div>
  );
}
