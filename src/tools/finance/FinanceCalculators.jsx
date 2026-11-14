import { useState, useEffect } from 'react';
import { computeCompoundInterest, COMPOUND_FREQUENCIES } from './compoundInterest';
import { computeFdMaturity, FD_DEFAULT_FREQUENCY } from './fdMaturity';
import { computeRdMaturity, RD_DEFAULT_FREQUENCY } from './rdMaturity';
import { computeLoanAmortization } from './loanAmortization';
import { computeHraExemption } from './hraExemption';
import { Field, Result, SelectField } from '../../components/tools/ToolFields';
import { money } from '../../lib/toolFormat';
import { getToolParams } from '../../data/toolParams';
import { CopyResultLink } from '../../components/tools/CopyResultLink';
import { useToolShareContext } from '../../lib/shareResults';

export function CompoundInterest() {
  const { updateSharePayload } = useToolShareContext();
  const init = () => getToolParams('compound-interest-calculator');
  const [principal, setPrincipal] = useState(() => init().principal || '100000');
  const [rate, setRate] = useState(() => init().rate || '10');
  const [years, setYears] = useState(() => init().years || '5');
  const [frequency, setFrequency] = useState(() => init().frequency || '1');
  const result = computeCompoundInterest({ principal, annualRatePct: rate, years, timesPerYear: frequency });

  useEffect(() => {
    updateSharePayload({
      headlineMetric: `₹ ${money(result.amount)} Maturity Value`,
      subMetrics: [
        { label: 'Interest Earned', value: `₹ ${money(result.interest)}` },
        { label: 'Effective Rate', value: `${result.effectiveRatePct.toFixed(2)}%` },
        { label: 'Tenure', value: `${years} Years` },
      ],
      summaryText: `Calculated compound interest maturity value of ₹ ${money(result.amount)} from ₹ ${money(principal)} at ${rate}% over ${years} years on OrbitBoard`,
      queryParams: { principal, rate, years, frequency },
    });
  }, [result, principal, rate, years, frequency, updateSharePayload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set('principal', principal);
      sp.set('rate', rate);
      sp.set('years', years);
      sp.set('frequency', frequency);
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
    } catch { /* ignore */ }
  }, [principal, rate, years, frequency]);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Initial principal (₹)" value={principal} onChange={setPrincipal} />
        <Field label="Annual interest rate (%)" value={rate} onChange={setRate} />
        <Field label="Time period (years)" value={years} onChange={setYears} />
        <SelectField label="Compounding frequency" value={frequency} onChange={setFrequency}>
          {COMPOUND_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </SelectField>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Maturity amount" value={`₹ ${money(result.amount)}`} highlight />
        <Result label="Interest earned" value={`₹ ${money(result.interest)}`} />
        <Result label="Effective annual rate" value={`${result.effectiveRatePct.toFixed(2)}%`} />
        <CopyResultLink slug="compound-interest-calculator" params={{ principal, rate, years, frequency }} />
      </div>
    </div>
  );
}

export function FdMaturity() {
  const { updateSharePayload } = useToolShareContext();
  const init = () => getToolParams('fd-maturity-calculator');
  const [principal, setPrincipal] = useState(() => init().principal || '100000');
  const [rate, setRate] = useState(() => init().rate || '7');
  const [years, setYears] = useState(() => init().years || '1');
  const [months, setMonths] = useState(() => init().months || '0');
  const [frequency, setFrequency] = useState(() => init().frequency || String(FD_DEFAULT_FREQUENCY));
  const result = computeFdMaturity({ principal, annualRatePct: rate, years, months, timesPerYear: frequency });

  useEffect(() => {
    updateSharePayload({
      headlineMetric: `₹ ${money(result.amount)} FD Maturity`,
      subMetrics: [
        { label: 'Interest Earned', value: `₹ ${money(result.interest)}` },
        { label: 'Principal', value: `₹ ${money(principal)}` },
        { label: 'Interest Rate', value: `${rate}% p.a.` },
      ],
      summaryText: `Fixed deposit maturity value of ₹ ${money(result.amount)} from ₹ ${money(principal)} at ${rate}% p.a. on OrbitBoard`,
      queryParams: { principal, rate, years, months, frequency },
    });
  }, [result, principal, rate, years, months, frequency, updateSharePayload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set('principal', principal);
      sp.set('rate', rate);
      sp.set('years', years);
      sp.set('months', months);
      sp.set('frequency', frequency);
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
    } catch { /* ignore */ }
  }, [principal, rate, years, months, frequency]);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Deposit amount (₹)" value={principal} onChange={setPrincipal} />
        <Field label="Interest rate per year (%)" value={rate} onChange={setRate} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tenure: years" value={years} onChange={setYears} />
          <Field label="Tenure: months" value={months} onChange={setMonths} />
        </div>
        <SelectField label="Compounding frequency" value={frequency} onChange={setFrequency}>
          {COMPOUND_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </SelectField>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Maturity amount" value={`₹ ${money(result.amount)}`} highlight />
        <Result label="Interest earned" value={`₹ ${money(result.interest)}`} />
        <Result label="Effective annual rate" value={`${result.effectiveRatePct.toFixed(2)}%`} />
        <CopyResultLink slug="fd-maturity-calculator" params={{ principal, rate, years, months, frequency }} />
      </div>
    </div>
  );
}

export function RdMaturity() {
  const { updateSharePayload } = useToolShareContext();
  const init = () => getToolParams('rd-maturity-calculator');
  const [deposit, setDeposit] = useState(() => init().deposit || '1000');
  const [rate, setRate] = useState(() => init().rate || '6.5');
  const [years, setYears] = useState(() => init().years || '1');
  const [months, setMonths] = useState(() => init().months || '0');
  const [frequency, setFrequency] = useState(() => init().frequency || String(RD_DEFAULT_FREQUENCY));
  const result = computeRdMaturity({ monthlyDeposit: deposit, annualRatePct: rate, years, months, timesPerYear: frequency });

  useEffect(() => {
    updateSharePayload({
      headlineMetric: `₹ ${money(result.maturity)} RD Maturity`,
      subMetrics: [
        { label: 'Interest Earned', value: `₹ ${money(result.interest)}` },
        { label: 'Total Deposited', value: `₹ ${money(result.invested)}` },
        { label: 'Monthly Deposit', value: `₹ ${money(deposit)}` },
      ],
      summaryText: `Recurring deposit maturity value of ₹ ${money(result.maturity)} with ₹ ${money(deposit)}/mo at ${rate}% on OrbitBoard`,
      queryParams: { deposit, rate, years, months, frequency },
    });
  }, [result, deposit, rate, years, months, frequency, updateSharePayload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set('deposit', deposit);
      sp.set('rate', rate);
      sp.set('years', years);
      sp.set('months', months);
      sp.set('frequency', frequency);
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
    } catch { /* ignore */ }
  }, [deposit, rate, years, months, frequency]);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Monthly deposit (₹)" value={deposit} onChange={setDeposit} />
        <Field label="Interest rate per year (%)" value={rate} onChange={setRate} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tenure: years" value={years} onChange={setYears} />
          <Field label="Tenure: months" value={months} onChange={setMonths} />
        </div>
        <SelectField label="Compounding frequency" value={frequency} onChange={setFrequency}>
          {COMPOUND_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </SelectField>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Maturity amount" value={`₹ ${money(result.maturity)}`} highlight />
        <Result label="Total deposited" value={`₹ ${money(result.invested)}`} />
        <Result label="Interest earned" value={`₹ ${money(result.interest)}`} />
        <CopyResultLink slug="rd-maturity-calculator" params={{ deposit, rate, years, months, frequency }} />
      </div>
    </div>
  );
}

export function LoanAmortization() {
  const { updateSharePayload } = useToolShareContext();
  const init = () => getToolParams('loan-amortization-calculator');
  const [principal, setPrincipal] = useState(() => init().principal || '1000000');
  const [rate, setRate] = useState(() => init().rate || '9');
  const [years, setYears] = useState(() => init().years || '5');
  const [months, setMonths] = useState('0');
  const result = computeLoanAmortization({ principal, annualRatePct: rate, years, months });

  useEffect(() => {
    updateSharePayload({
      headlineMetric: `₹ ${money(result.emi)} Monthly EMI`,
      subMetrics: [
        { label: 'Total Interest', value: `₹ ${money(result.totalInterest)}` },
        { label: 'Total Payment', value: `₹ ${money(result.totalPayment)}` },
        { label: 'Tenure', value: `${years} Years` },
      ],
      summaryText: `Loan amortization: ₹ ${money(result.emi)} monthly EMI on ₹ ${money(principal)} at ${rate}% for ${years} years on OrbitBoard`,
      queryParams: { principal, rate, years },
    });
  }, [result, principal, rate, years, updateSharePayload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set('principal', principal);
      sp.set('rate', rate);
      sp.set('years', years);
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
    } catch { /* ignore */ }
  }, [principal, rate, years]);

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-7 space-y-4">
          <Field label="Loan amount (₹)" value={principal} onChange={setPrincipal} />
          <Field label="Interest rate per year (%)" value={rate} onChange={setRate} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tenure: years" value={years} onChange={setYears} />
            <Field label="Tenure: months" value={months} onChange={setMonths} />
          </div>
        </div>
        <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
          <Result label="Monthly EMI" value={`₹ ${money(result.emi)}`} highlight />
          <Result label="Total interest" value={`₹ ${money(result.totalInterest)}`} />
          <Result label="Total payment" value={`₹ ${money(result.totalPayment)}`} />
          <CopyResultLink slug="loan-amortization-calculator" params={{ principal, rate, years }} />
        </div>
      </div>

      {result.yearly.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">Yearly breakdown</h3>
          <div className="overflow-x-auto rounded-2xl border border-[var(--orbit-border)]">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 text-left text-xs uppercase tracking-wide text-stone-600 dark:text-stone-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold text-right">Principal paid</th>
                  <th className="px-4 py-3 font-semibold text-right">Interest paid</th>
                  <th className="px-4 py-3 font-semibold text-right">Closing balance</th>
                </tr>
              </thead>
              <tbody>
                {result.yearly.map(row => (
                  <tr key={row.year} className="border-t border-[var(--orbit-border)] text-stone-900 dark:text-stone-100">
                    <td className="px-4 py-3">{row.year}</td>
                    <td className="px-4 py-3 text-right">₹ {money(row.principalPaid)}</td>
                    <td className="px-4 py-3 text-right">₹ {money(row.interestPaid)}</td>
                    <td className="px-4 py-3 text-right">₹ {money(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function HraExemption() {
  const { updateSharePayload } = useToolShareContext();
  const init = () => getToolParams('hra-exemption-calculator-india');
  const [basic, setBasic] = useState(() => init().basic || '600000');
  const [hra, setHra] = useState(() => init().hra || '240000');
  const [rent, setRent] = useState(() => init().rent || '240000');
  const [metro, setMetro] = useState(() => (init().metro === 'false' ? 'no' : 'yes'));
  const result = computeHraExemption({ basicAnnual: basic, hraReceivedAnnual: hra, rentPaidAnnual: rent, metro: metro === 'yes' });
  const bindingText = {
    actualHra: 'Your actual HRA is the lowest limit.',
    percentOfBasic: `${metro === 'yes' ? '50%' : '40%'} of basic salary is the lowest limit.`,
    rentMinusTenPercent: 'Rent paid minus 10% of basic salary is the lowest limit.',
  };

  useEffect(() => {
    updateSharePayload({
      headlineMetric: `₹ ${money(result.exempt)} HRA Exemption`,
      subMetrics: [
        { label: 'Taxable HRA', value: `₹ ${money(result.taxable)}` },
        { label: 'Annual Rent', value: `₹ ${money(rent)}` },
        { label: 'City Type', value: metro === 'yes' ? 'Metro (50%)' : 'Non-metro (40%)' },
      ],
      summaryText: `Calculated ₹ ${money(result.exempt)} HRA tax exemption on ₹ ${money(basic)} basic and ₹ ${money(rent)} rent on OrbitBoard`,
      queryParams: { basic, hra, rent, metro: metro === 'yes' ? 'true' : 'false' },
    });
  }, [result, basic, hra, rent, metro, updateSharePayload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set('basic', basic);
      sp.set('hra', hra);
      sp.set('rent', rent);
      sp.set('metro', metro === 'yes' ? 'true' : 'false');
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
    } catch { /* ignore */ }
  }, [basic, hra, rent, metro]);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Annual basic salary (₹)" value={basic} onChange={setBasic} />
        <Field label="Annual HRA received (₹)" value={hra} onChange={setHra} />
        <Field label="Annual rent paid (₹)" value={rent} onChange={setRent} />
        <SelectField label="Where do you live?" value={metro} onChange={setMetro}>
          <option value="yes">Metro: Delhi, Mumbai, Kolkata or Chennai</option>
          <option value="no">Non-metro city</option>
        </SelectField>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Tax-exempt HRA" value={`₹ ${money(result.exempt)}`} highlight />
        <Result label="Taxable HRA" value={`₹ ${money(result.taxable)}`} />
        <CopyResultLink slug="hra-exemption-calculator-india" params={{ basic, hra, rent, metro: metro === 'yes' ? 'true' : 'false' }} />
        <p className="text-xs leading-5 text-stone-600 dark:text-stone-300 px-1">
          {result.exempt > 0 ? bindingText[result.binding] : 'No exemption applies with these figures.'} This follows the old tax regime (FY 2024-25 & 2025-26). Estimate only, not professional advice.
        </p>
      </div>
    </div>
  );
}
