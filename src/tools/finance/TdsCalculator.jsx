import { useState, useMemo } from 'react';
import {
  AlertTriangle, ShieldAlert, Calendar
} from 'lucide-react';
import { calculateTds, TDS_CONFIG, isValidPan } from './tdsEngine.js';
import { formatINR } from '../../lib/toolFormat.js';

export function TdsCalculator() {
  const [section, setSection] = useState('194C');
  const [amount, setAmount] = useState('50000');
  const [panProvided, setPanProvided] = useState(true);
  const [pan, setPan] = useState('AAACC1234D');
  const [recipientType, setRecipientType] = useState('individual');
  const [isSenior, setIsSenior] = useState(false);
  const [subType, setSubType] = useState('technical');
  const [regime, setRegime] = useState('new');

  const selectedConfig = TDS_CONFIG[section] || TDS_CONFIG['194C'];

  const result = useMemo(() => {
    return calculateTds({
      section,
      amount: Number(amount) || 0,
      panProvided,
      pan: panProvided ? pan : '',
      recipientType,
      isSenior,
      subType,
      regime,
    });
  }, [section, amount, panProvided, pan, recipientType, isSenior, subType, regime]);

  const hasInvalidPan = panProvided && pan.trim() !== '' && !isValidPan(pan);

  return (
    <div className="space-y-6">
      {/* Main Grid: Form (Left) & Results Summary (Right) */}
      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left: Input Configuration */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">
              Transaction Details & TDS Section
            </h3>

            {/* Section Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Select TDS Section
              </label>
              <select
                value={section}
                onChange={e => {
                  const s = e.target.value;
                  setSection(s);
                  if (s === '194I') setSubType('building');
                  if (s === '194J') setSubType('technical');
                }}
                className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
              >
                <option value="194C">Section 194C - Payments to Contractors & Sub-contractors</option>
                <option value="194J">Section 194J - Fees for Professional & Technical Services</option>
                <option value="194I">Section 194I - Rent on Property, Plant & Machinery</option>
                <option value="194A">Section 194A - Interest other than Securities (FD / RD)</option>
                <option value="194H">Section 194H - Commission or Brokerage</option>
                <option value="192">Section 192 - Salary Remuneration</option>
              </select>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {selectedConfig.description}
              </p>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Gross Transaction / Bill Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
              />
            </div>

            {/* Section-Specific Conditional Inputs */}
            {section === '194C' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Deductee Entity Type
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setRecipientType('individual')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      recipientType === 'individual'
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300'
                        : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    Individual / HUF (1%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('company')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      recipientType === 'company'
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300'
                        : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    Company / Firm / LLP (2%)
                  </button>
                </div>
              </div>
            )}

            {section === '194I' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Asset Category
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setSubType('machinery')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      subType === 'machinery'
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300'
                        : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    Plant, Machinery & Equipment (2%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubType('building')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      subType === 'building'
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300'
                        : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    Land, Building & Furniture (10%)
                  </button>
                </div>
              </div>
            )}

            {section === '194J' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Service Category
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setSubType('technical')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      subType === 'technical'
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300'
                        : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    Technical Services / Royalty (2%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubType('professional')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      subType === 'professional'
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300'
                        : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    Professional Services (10%)
                  </button>
                </div>
              </div>
            )}

            {section === '194A' && (
              <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-3 flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 block">
                    Senior Citizen Deductee (Age 60+)
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Threshold increases from ₹40,000 to ₹50,000
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isSenior}
                  onChange={e => setIsSenior(e.target.checked)}
                  className="w-4 h-4 rounded text-accent-600"
                />
              </label>
            )}

            {section === '192' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Tax Regime
                </label>
                <select
                  value={regime}
                  onChange={e => setRegime(e.target.value)}
                  className="orbit-control mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500"
                >
                  <option value="new">New Tax Regime (Section 115BAC - ₹75k standard deduction)</option>
                  <option value="old">Old Tax Regime (₹50k standard deduction)</option>
                </select>
              </div>
            )}

            {/* PAN & Section 206AA Section */}
            <div className="pt-3 border-t border-[var(--orbit-border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Deductee PAN Verification
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 dark:text-stone-400">
                  <input
                    type="checkbox"
                    checked={panProvided}
                    onChange={e => setPanProvided(e.target.checked)}
                    className="w-4 h-4 rounded text-accent-600"
                  />
                  PAN Available
                </label>
              </div>

              {panProvided ? (
                <div>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={pan}
                    onChange={e => setPan(e.target.value.toUpperCase())}
                    className="orbit-control w-full rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 uppercase font-mono outline-none focus:border-accent-500"
                  />
                  {hasInvalidPan && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Format must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block">Section 206AA Penal Rate Triggered!</span>
                    Without a valid PAN, the deductor must deduct TDS at a flat 20% rate.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Results & Summary Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-[var(--orbit-border)] shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">
              TDS Computation Summary
            </h3>

            {/* Highlight Metric */}
            <div className={`p-4 rounded-xl border ${
              result.isPenal
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                : result.isExempt
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                : 'bg-stone-50 dark:bg-stone-800/50 border-[var(--orbit-border)]'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                    TDS to Deduct
                  </span>
                  <div className="text-2xl font-black mt-1 text-stone-900 dark:text-stone-100">
                    {formatINR(result.tdsAmount)}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                  result.isPenal
                    ? 'bg-rose-600 text-white'
                    : result.isExempt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-accent-600 text-white'
                }`}>
                  {result.ratePct}
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
                {result.reason}
              </p>
            </div>

            {/* Line Item Breakdown */}
            <div className="space-y-3 text-xs border-t border-b border-[var(--orbit-border)] py-4">
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Gross Invoice / Bill Amount:</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{result.formattedAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Statutory Threshold Limit:</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{formatINR(result.threshold)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">TDS Deduction Amount:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">-{result.formattedTds}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--orbit-border)] text-sm font-bold">
                <span className="text-stone-800 dark:text-stone-200">Net Payable to Vendor:</span>
                <span className="text-emerald-700 dark:text-emerald-400">{result.formattedNetPayable}</span>
              </div>
            </div>

            {/* Compliance & Due Dates */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-[var(--orbit-border)] space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
                <Calendar className="w-4 h-4 text-accent-600" />
                Statutory Compliance Schedule
              </div>
              <div className="text-stone-600 dark:text-stone-400 space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>Payment Due Date:</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">7th of following month</span>
                </div>
                <div className="flex justify-between">
                  <span>March Due Date:</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">30th April</span>
                </div>
                <div className="flex justify-between">
                  <span>Challan / Return Form:</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">{result.challan}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TdsCalculator;
