import { useState } from 'react';
import { computeCompoundInterest, COMPOUND_FREQUENCIES } from './compoundInterest';
import { computeFdMaturity, FD_DEFAULT_FREQUENCY } from './fdMaturity';
import { computeRdMaturity, RD_DEFAULT_FREQUENCY } from './rdMaturity';
import { computeLoanAmortization } from './loanAmortization';
import { computeHraExemption } from './hraExemption';
import { Field, Result, SelectField } from '../../components/tools/ToolFields';
import { money } from '../../lib/toolFormat';

export function CompoundInterest() {
  const [principal, setPrincipal] = useState('100000'), [rate, setRate] = useState('10'), [years, setYears] = useState('5'), [frequency, setFrequency] = useState('1');
  const result = computeCompoundInterest({ principal, annualRatePct: rate, years, timesPerYear: frequency });

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
      </div>
    </div>
  );
}

export function FdMaturity() {
  const [principal, setPrincipal] = useState('100000'), [rate, setRate] = useState('7'), [years, setYears] = useState('1'), [months, setMonths] = useState('0'), [frequency, setFrequency] = useState(String(FD_DEFAULT_FREQUENCY));
  const result = computeFdMaturity({ principal, annualRatePct: rate, years, months, timesPerYear: frequency });

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
      </div>
    </div>
  );
}

export function RdMaturity() {
  const [deposit, setDeposit] = useState('1000'), [rate, setRate] = useState('6.5'), [years, setYears] = useState('1'), [months, setMonths] = useState('0'), [frequency, setFrequency] = useState(String(RD_DEFAULT_FREQUENCY));
  const result = computeRdMaturity({ monthlyDeposit: deposit, annualRatePct: rate, years, months, timesPerYear: frequency });

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
      </div>
    </div>
  );
}

export function LoanAmortization() {
  const [principal, setPrincipal] = useState('1000000'), [rate, setRate] = useState('9'), [years, setYears] = useState('5'), [months, setMonths] = useState('0');
  const result = computeLoanAmortization({ principal, annualRatePct: rate, years, months });

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
  const [basic, setBasic] = useState('600000'), [hra, setHra] = useState('240000'), [rent, setRent] = useState('240000'), [metro, setMetro] = useState('yes');
  const result = computeHraExemption({ basicAnnual: basic, hraReceivedAnnual: hra, rentPaidAnnual: rent, metro: metro === 'yes' });
  const bindingText = {
    actualHra: 'Your actual HRA is the lowest limit.',
    percentOfBasic: `${metro === 'yes' ? '50%' : '40%'} of basic salary is the lowest limit.`,
    rentMinusTenPercent: 'Rent paid minus 10% of basic salary is the lowest limit.',
  };

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
        <p className="text-xs leading-5 text-stone-600 dark:text-stone-300 px-1">
          {result.exempt > 0 ? bindingText[result.binding] : 'No exemption applies with these figures.'} This follows the old tax regime. Confirm details with your tax adviser or employer.
        </p>
      </div>
    </div>
  );
}
