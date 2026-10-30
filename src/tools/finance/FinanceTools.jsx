import { useState } from 'react';
import { Field, Result } from '../../components/tools/ToolFields';
import { money, num } from '../../lib/toolFormat';

export function Emi() {
  const [principal, setPrincipal] = useState('1000000'), [rate, setRate] = useState('9'), [years, setYears] = useState('5');
  const p = num(principal), r = num(rate) / 1200, n = Math.max(1, Math.round(num(years) * 12));
  const emi = r ? p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : p / n;
  const total = emi * n;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Loan amount (₹)" value={principal} onChange={setPrincipal} />
        <Field label="Annual interest rate (%)" value={rate} onChange={setRate} />
        <Field label="Tenure (years)" value={years} onChange={setYears} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Monthly EMI" value={`₹ ${money(emi)}`} highlight />
        <Result label="Total interest" value={`₹ ${money(total - p)}`} />
        <Result label="Total repayment" value={`₹ ${money(total)}`} />
      </div>
    </div>
  );
}

export function Gst() {
  const [amount, setAmount] = useState('100000'), [rate, setRate] = useState('18'), [mode, setMode] = useState('exclusive');
  const base = num(amount), gst = mode === 'exclusive' ? base * num(rate) / 100 : base * num(rate) / (100 + num(rate));
  const total = mode === 'exclusive' ? base + gst : base;
  const preGst = mode === 'exclusive' ? base : base - gst;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label={mode === 'exclusive' ? 'Pre-GST amount (₹)' : 'GST-inclusive amount (₹)'} value={amount} onChange={setAmount} />
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">GST rate</span>
          <select value={rate} onChange={e => setRate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
            <option value="0">0% (Nil / Exempt)</option><option value="5">5% (Merit Rate)</option><option value="18">18% (Standard Rate)</option><option value="40">40% (Luxury Rate)</option><option value="3">3% (Special Rate)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Calculation mode</span>
          <select value={mode} onChange={e => setMode(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
            <option value="exclusive">Add GST to price</option><option value="inclusive">Extract GST from inclusive price</option>
          </select>
        </label>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Pre-GST value" value={`₹ ${money(preGst)}`} highlight />
        <Result label="GST amount" value={`₹ ${money(gst)}`} highlight />
        <Result label="Final price" value={`₹ ${money(total)}`} />
      </div>
    </div>
  );
}

export function Sip() {
  const [monthly, setMonthly] = useState('10000'), [rate, setRate] = useState('12'), [years, setYears] = useState('10');
  const p = num(monthly), r = num(rate) / 1200, n = num(years) * 12;
  const maturity = r > 0 ? p * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : p * n;
  const invested = p * n, returns = Math.max(0, maturity - invested);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Monthly SIP (₹)" value={monthly} onChange={setMonthly} />
        <Field label="Expected annual return (%)" value={rate} onChange={setRate} />
        <Field label="Investment period (years)" value={years} onChange={setYears} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Estimated maturity value" value={`₹ ${money(maturity)}`} highlight />
        <Result label="Total amount invested" value={`₹ ${money(invested)}`} />
        <Result label="Estimated returns" value={`₹ ${money(returns)}`} />
      </div>
    </div>
  );
}
