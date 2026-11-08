import { useState, useMemo } from 'react';
import { Building2, User, Percent } from 'lucide-react';
import { calculatePfEsi, PF_STATUTORY_CONFIG, ESI_STATUTORY_CONFIG } from './pfEsiEngine.js';
import { formatINR } from '../../lib/toolFormat.js';

export function PfEsiCalculator() {
  const [basicSalary, setBasicSalary] = useState('25000');
  const [grossSalary, setGrossSalary] = useState('45000');
  const [capPf, setCapPf] = useState(true);
  const [hasDisability, setHasDisability] = useState(false);

  const result = useMemo(() => {
    return calculatePfEsi({
      basicSalary: Number(basicSalary) || 0,
      grossSalary: Number(grossSalary) || 0,
      capPf,
      hasDisability,
    });
  }, [basicSalary, grossSalary, capPf, hasDisability]);

  return (
    <div className="space-y-6">
      {/* Main Grid: Inputs (Left) and Breakdown Cards (Right) */}
      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">
              Wage Parameters
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Monthly Basic Salary + DA (₹)
              </label>
              <input
                type="number"
                value={basicSalary}
                onChange={e => setBasicSalary(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                EPF is computed on Basic + Dearness Allowance.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Monthly Gross Salary (₹)
              </label>
              <input
                type="number"
                value={grossSalary}
                onChange={e => setGrossSalary(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                ESI applies if gross salary is ≤ ₹21,000 (or ₹25,000 for disability).
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-3.5 flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 block">
                    Cap EPF at Statutory Wage Limit
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Caps wage at ₹15,000/mo (Max ₹1,800 employee PF)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={capPf}
                  onChange={e => setCapPf(e.target.checked)}
                  className="w-4 h-4 rounded text-accent-600"
                />
              </label>

              <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-3.5 flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 block">
                    Employee with Disability
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Extends ESI coverage threshold to ₹25,000/mo
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hasDisability}
                  onChange={e => setHasDisability(e.target.checked)}
                  className="w-4 h-4 rounded text-accent-600"
                />
              </label>
            </div>
          </div>

          {/* Statutory Limits Reference Card */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-[var(--orbit-border)] space-y-2 text-xs">
            <h4 className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-accent-600" />
              Statutory Benchmark Ceilings (Config-Driven)
            </h4>
            <div className="space-y-1 text-stone-600 dark:text-stone-400">
              <div className="flex justify-between">
                <span>EPF Wage Ceiling:</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(PF_STATUTORY_CONFIG.wageCeilingMonthly)} / month</span>
              </div>
              <div className="flex justify-between">
                <span>Max Employee PF (Capped):</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(PF_STATUTORY_CONFIG.maxCappedEmployeeMonthly)} / month</span>
              </div>
              <div className="flex justify-between">
                <span>Max Employer EPS Pension:</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(PF_STATUTORY_CONFIG.maxCappedEpsMonthly)} / month</span>
              </div>
              <div className="flex justify-between">
                <span>Max Employer EDLI Insurance:</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(PF_STATUTORY_CONFIG.maxCappedEdliMonthly)} / month</span>
              </div>
              <div className="flex justify-between">
                <span>ESI Wage Ceiling (Standard):</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(ESI_STATUTORY_CONFIG.statutoryWageCeilingMonthly)} / month</span>
              </div>
              <div className="flex justify-between">
                <span>ESI Wage Ceiling (Disability):</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{formatINR(ESI_STATUTORY_CONFIG.disabilityWageCeilingMonthly)} / month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown Cards */}
        <div className="lg:col-span-7 space-y-5">
          {/* Highlight KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                Employee Deductions
              </span>
              <div className="text-xl font-black text-rose-800 dark:text-rose-200 mt-1">
                {result.formattedTotalEmployeeDeductions}
              </div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400">Deducted from gross salary</span>
            </div>

            <div className="p-4 rounded-xl bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400 block">
                Employer Contribution
              </span>
              <div className="text-xl font-black text-accent-800 dark:text-accent-200 mt-1">
                {result.formattedTotalEmployerContribution}
              </div>
              <span className="text-[10px] text-accent-600 dark:text-accent-400">Part of CTC overhead</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                Total Remittance to Govt
              </span>
              <div className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-1">
                {result.formattedTotalStatutoryRemittance}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Combined EPFO + ESIC</span>
            </div>
          </div>

          {/* Detailed Contribution Breakdown */}
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] shadow-xs space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Statutory Remittance Breakdown
            </h3>

            {/* Employee Share Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 border-b border-rose-100 dark:border-rose-900 pb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Employee Contributions (Salary Deductions)
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Employees Provident Fund (EPF @ 12%):
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {result.formattedEmployeePf}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Employees State Insurance (ESI @ 0.75%):
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {result.isEsiEligible ? result.formattedEmployeeEsi : '₹ 0 (Wage > ₹21,000)'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--orbit-border)] font-bold text-stone-900 dark:text-stone-100">
                  <span>Total Employee Deductions:</span>
                  <span className="text-rose-600 dark:text-rose-400">{result.formattedTotalEmployeeDeductions}</span>
                </div>
              </div>
            </div>

            {/* Employer Share Table */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400 border-b border-accent-100 dark:border-accent-900 pb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Employer Contributions (Company Overhead)
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Employer EPF Share (3.67%):
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {result.formattedEmployerPf}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Employees Pension Scheme (EPS @ 8.33%, Capped):
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {result.formattedEmployerEps}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Deposit Linked Insurance (EDLI @ 0.50%, Capped):
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {result.formattedEmployerEdli}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    EPF Administration Charges (0.50%):
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {formatINR(result.employerAdmin)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    Employer ESI Share (3.25%):
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {result.isEsiEligible ? result.formattedEmployerEsi : '₹ 0 (Wage > ₹21,000)'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--orbit-border)] font-bold text-stone-900 dark:text-stone-100">
                  <span>Total Employer Statutory Overhead:</span>
                  <span className="text-accent-600 dark:text-accent-400">{result.formattedTotalEmployerContribution}</span>
                </div>
              </div>
            </div>

            {/* Net Take-Home Highlight */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  Gross Pay after Statutory Deductions
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  (Before Income Tax / TDS and Professional Tax)
                </span>
              </div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                {formatINR(result.netPayAfterStatutory)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PfEsiCalculator;
