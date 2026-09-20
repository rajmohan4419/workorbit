import { useMemo, useState } from 'react';

const COUNTRIES = {
  us: {
    name: 'United States — Federal',
    currency: '$',
    note: '2026 federal income tax only. State/local taxes are excluded.',
    brackets: { single: [[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]], joint: [[24800,.10],[100800,.12],[211400,.22],[403550,.24],[512450,.32],[768700,.35],[Infinity,.37]] },
    deduction: { single: 16100, joint: 32200 }
  },
  uk: {
    name: 'United Kingdom — England/Wales/NI',
    currency: '£',
    note: '2026-27 employment/non-savings income. Scotland uses different rates.',
    brackets: [[12570,0],[50270,.20],[125140,.40],[Infinity,.45]],
    deduction: 12570
  },
  canada: {
    name: 'Canada — Federal',
    currency: 'C$',
    note: '2026 federal tax only. Provincial/territorial income tax is excluded.',
    brackets: [[58523,.14],[117045,.205],[181440,.26],[258482,.29],[Infinity,.33]],
    deduction: 16452
  },
  australia: {
    name: 'Australia — Resident',
    currency: 'A$',
    note: '2026-27 resident rates. Medicare levy and state taxes are excluded.',
    brackets: [[18200,0],[45000,.15],[135000,.30],[190000,.37],[Infinity,.45]],
    deduction: 18200
  },
  singapore: {
    name: 'Singapore — Resident',
    currency: 'S$',
    note: 'Resident progressive rates from YA 2024 onwards. Chargeable income is used.',
    brackets: [[20000,0],[30000,.02],[40000,.035],[80000,.07],[120000,.115],[160000,.15],[200000,.18],[240000,.19],[280000,.195],[320000,.20],[500000,.22],[1000000,.23],[Infinity,.24]],
    deduction: 0
  },
  germany: {
    name: 'Germany — Individual',
    currency: '€',
    note: '2026 income-tax tariff. Solidarity surcharge, church tax and social contributions are excluded.',
    deduction: 12348
  },
  japan: {
    name: 'Japan — National income tax',
    currency: '¥',
    note: 'National income tax only, using the 2026 seven-rate schedule. Local inhabitant tax and reconstruction surcharge are excluded.',
    brackets: [[1949000,.05],[3299000,.10],[6949000,.20],[8999000,.23],[17999000,.33],[39999000,.40],[Infinity,.45]],
    deductions: [0,97500,427500,636000,1536000,2796000,4796000]
  },
  uae: {
    name: 'United Arab Emirates',
    currency: 'AED',
    note: 'No UAE federal personal income tax on individuals. This calculator returns zero personal income tax.',
    brackets: [[Infinity,0]],
    deduction: 0
  }
};

function progressive(income, brackets) {
  let previous = 0;
  let tax = 0;
  for (const [limit, rate] of brackets) {
    const taxable = Math.max(0, Math.min(income, limit) - previous);
    tax += taxable * rate;
    previous = limit;
    if (income <= limit) break;
  }
  return tax;
}

function germanyTax(income) {
  const x = Math.floor(Math.max(0, income));
  if (x <= 12348) return 0;
  if (x <= 17799) {
    const y = (x - 12348) / 10000;
    return (914.51 * y + 1400) * y;
  }
  if (x <= 69878) {
    const z = (x - 17799) / 10000;
    return (173.10 * z + 2397) * z + 1034.87;
  }
  if (x <= 277825) return .42 * x - 11135.63;
  return .45 * x - 19470.38;
}

function japanTax(income) {
  const x = Math.max(0, Math.floor(income / 1000) * 1000);
  const rates = [0.05,0.10,0.20,0.23,0.33,0.40,0.45];
  const thresholds = [1949000,3299000,6949000,8999000,17999000,39999000,Infinity];
  let index = thresholds.findIndex(t => x <= t);
  if (index < 0) index = 6;
  return x * rates[index] - [0,97500,427500,636000,1536000,2796000,4796000][index];
}

export default function GlobalIncomeTaxCalculator() {
  const [country, setCountry] = useState('us');
  const [income, setIncome] = useState('100000');
  const [status, setStatus] = useState('single');

  const result = useMemo(() => {
    const config = COUNTRIES[country];
    const gross = Math.max(0, Number(income) || 0);

    if (country === 'uae') return { gross, taxable: gross, tax: 0, effective: 0, config };
    if (country === 'germany') {
      const taxable = Math.max(0, gross - config.deduction);
      const tax = Math.max(0, germanyTax(taxable));
      return { gross, taxable, tax, effective: gross ? tax / gross * 100 : 0, config };
    }
    if (country === 'japan') {
      const tax = Math.max(0, japanTax(gross));
      return { gross, taxable: gross, tax, effective: gross ? tax / gross * 100 : 0, config };
    }

    const brackets = country === 'us' ? config.brackets[status] : config.brackets;
    const taxable = Math.max(0, gross - config.deduction);
    const tax = progressive(taxable, brackets);
    return { gross, taxable, tax, effective: gross ? tax / gross * 100 : 0, config };
  }, [country, income, status]);

  const format = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value));

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Country</span>
          <select value={country} onChange={e => setCountry(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            {Object.entries(COUNTRIES).map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Annual income / taxable income ({COUNTRIES[country].currency})</span>
          <input type="number" min="0" value={income} onChange={e => setIncome(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-violet-500" />
        </label>
      </div>

      {country === 'us' && (
        <label className="block">
          <span className="text-xs font-medium text-slate-400">US filing status</span>
          <select value={status} onChange={e => setStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            <option value="single">Single / Married filing separately</option>
            <option value="joint">Married filing jointly</option>
          </select>
        </label>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-violet-500/40 bg-violet-950/20 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">Estimated income tax</span>
          <strong className="text-lg text-violet-300">{COUNTRIES[country].currency} {format(result.tax)}</strong>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">Effective tax rate</span>
          <strong className="text-sm text-white">{result.effective.toFixed(2)}%</strong>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">Income after basic allowance/deduction</span>
          <strong className="text-sm text-white">{COUNTRIES[country].currency} {format(result.taxable)}</strong>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 space-y-2">
        <p>{COUNTRIES[country].note}</p>
        <p>This is a simplified income-tax estimator, not a complete tax return calculation. Deductions, credits, social insurance, local taxes and special-rate income can materially change actual liability.</p>
      </div>
    </div>
  );
}
