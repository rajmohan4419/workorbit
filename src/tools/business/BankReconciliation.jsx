import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, Download, Sparkles, HelpCircle, Check, Share2
} from 'lucide-react';
import { useToolShareContext } from '../../lib/shareResults';
import { exportSpreadsheet, downloadSpreadsheetBlob } from '../../engines/excelEngine';
import {
  normalizeTransaction,
  reconcileTransactions,
  SAMPLE_RECONCILIATION_DATA,
} from '../../engines/bankReconciliationEngine';
import { FinanceFileImport } from '../../components/tools/FinanceFileImport.jsx';
import { FINANCE_SCOPE } from '../../engines/financeImport.js';
import { trackExportClicked } from '../../lib/analytics';

const BANK_FIELDS = [
  { key: 'date', label: 'Date', required: true }, { key: 'reference', label: 'Reference' }, { key: 'description', label: 'Description' },
  { key: 'debit', label: 'Debit (bank out / ledger in)' }, { key: 'credit', label: 'Credit (bank in / ledger out)' },
  { key: 'amount', label: 'Signed amount (alternative)' }, { key: 'type', label: 'DR/CR or receipt/payment indicator' },
];
const CANONICAL_MAPPING = Object.fromEntries(BANK_FIELDS.map(f => [f.key, f.key]));
function detectBankColumns(headers) {
  const patterns = { date: /^(date|transaction date|value date)$/i, reference: /reference|ref|cheque|utr|voucher/i, description: /description|narration|particular/i, debit: /^(debit|withdrawal|receipt|dr)$/i, credit: /^(credit|deposit|payment|cr)$/i, amount: /^(amount|signed amount|amt)$/i, type: /^(type|dr.?cr|direction|indicator)$/i };
  return Object.fromEntries(Object.entries(patterns).map(([key, pattern]) => [key, headers.find(h => pattern.test(h)) || '']));
}
function bankErrors(row, index, source) {
  const result = normalizeTransaction(row, CANONICAL_MAPPING, source, index);
  return result.error ? [{ rowNumber: row.__sourceRow ?? index + 1, message: result.error }] : [];
}
const validateBank = (row, index) => bankErrors(row, index, 'bank');
const validateLedger = (row, index) => bankErrors(row, index, 'ledger');
export default function BankReconciliation() {
  const { updateSharePayload, openShareModal } = useToolShareContext();
  const [bankSource, setBankSource] = useState(null);
  const [ledgerSource, setLedgerSource] = useState(null);
  const [demo, setDemo] = useState(false);
  const [importEpoch, setImportEpoch] = useState(0);
  const bankData = bankSource?.rows, ledgerData = ledgerSource?.rows;
  const bankMapping = CANONICAL_MAPPING, ledgerMapping = CANONICAL_MAPPING;
  const [closingBankBalance, setClosingBankBalance] = useState('0');
  const [closingLedgerBalance, setClosingLedgerBalance] = useState('0');
  const [dateToleranceDays, setDateToleranceDays] = useState(3);
  const [activeTab, setActiveTab] = useState('matched');
  const [searchTerm, setSearchTerm] = useState('');
  const error = !Number.isFinite(Number(closingBankBalance)) || !Number.isFinite(Number(closingLedgerBalance)) || closingBankBalance === '' || closingLedgerBalance === '' ? 'Enter finite closing balances.' : null;
  function reset() {
    setBankSource(null); setLedgerSource(null); setDemo(false); setClosingBankBalance('0'); setClosingLedgerBalance('0'); setImportEpoch(n => n + 1);
  }
  function commit(source, data) {
    if (demo) { setBankSource(null); setLedgerSource(null); setClosingBankBalance('0'); setClosingLedgerBalance('0'); }
    setDemo(false);
    (source === 'bank' ? setBankSource : setLedgerSource)(data);
  }
  const loadSampleDataset = () => {
    const map = (rows, source) => rows.map((r, i) => ({ date: r.Date, description: r.Description, reference: r.Reference,
      debit: source === 'bank' ? r.Withdrawal : r.Receipt, credit: source === 'bank' ? r.Deposit : r.Payment, __sourceRow: i + 2, __sourceLabel: `Synthetic ${source}` }));
    setBankSource({ rows: map(SAMPLE_RECONCILIATION_DATA.bankRows, 'bank'), label: 'Synthetic bank demo' });
    setLedgerSource({ rows: map(SAMPLE_RECONCILIATION_DATA.ledgerRows, 'ledger'), label: 'Synthetic ledger demo' });
    setClosingBankBalance(String(SAMPLE_RECONCILIATION_DATA.closingBankBalance));
    setClosingLedgerBalance(String(SAMPLE_RECONCILIATION_DATA.closingLedgerBalance));
    setDemo(true); setImportEpoch(n => n + 1);
  };

  // Perform reconciliation & calculate row errors
  const { reconciliation, rowErrors } = useMemo(() => {
    if (error || !bankData || !ledgerData || bankData.length === 0 || ledgerData.length === 0) {
      return { reconciliation: null, rowErrors: { bank: [], ledger: [] } };
    }

    try {
      const bankNormalized = [];
      const bankErrList = [];
      bankData.forEach((r, i) => {
        const { transaction, error: err } = normalizeTransaction(r, bankMapping, 'bank', i);
        if (err) bankErrList.push(err);
        if (transaction) bankNormalized.push(transaction);
      });

      const ledgerNormalized = [];
      const ledgerErrList = [];
      ledgerData.forEach((r, i) => {
        const { transaction, error: err } = normalizeTransaction(r, ledgerMapping, 'ledger', i);
        if (err) ledgerErrList.push(err);
        if (transaction) ledgerNormalized.push(transaction);
      });

      const rec = reconcileTransactions(bankNormalized, ledgerNormalized, {
        dateToleranceDays: Number(dateToleranceDays),
        closingBankBalance: Number(closingBankBalance),
        closingLedgerBalance: Number(closingLedgerBalance),
      });

      return {
        reconciliation: rec,
        rowErrors: { bank: bankErrList, ledger: ledgerErrList },
      };
    } catch {
      return { reconciliation: null, rowErrors: { bank: [], ledger: [] } };
    }
  }, [bankData, ledgerData, bankMapping, ledgerMapping, dateToleranceDays, closingBankBalance, closingLedgerBalance, error]);

  const reviewRequired = rowErrors.bank.length + rowErrors.ledger.length > 0 || (reconciliation?.summary.ambiguousMatchesCount ?? 0) > 0;

  // Live Result Share Context Registration
  useEffect(() => {
    if (!reconciliation) { updateSharePayload(null); return; }
    if (reconciliation?.summary) {
      const sum = reconciliation.summary;
      const matchPct = sum.matchRatePercent ?? 0;
      updateSharePayload({
        headlineMetric: `${matchPct}% Match Rate`,
        subMetrics: [
          { label: 'Matched Pairs', value: `${sum.matchedPairsCount || 0} pairs` },
          { label: 'Recon Status', value: reviewRequired ? 'Requires review' : sum.isStatementReconciled ? 'Adjusted balances agree' : 'Variance detected' },
          { label: 'Adjusted Bank', value: `₹${(sum.adjustedBankBalance || 0).toLocaleString('en-IN')}` },
        ],
        summaryText: `Reconciled bank statement with ${matchPct}% match rate (${sum.matchedPairsCount || 0} matched transaction pairs) on OrbitBoard.`,
        queryParams: {}, // Strictly zero PII in query params
      });
    }
  }, [reconciliation, reviewRequired, updateSharePayload]);

  const handleExportReport = () => {
    if (!reconciliation) return;

    const statementSheet = [
      { 'Bank Reconciliation Statement': 'Bank Side Adjustments', 'Amount (₹)': '' },
      { 'Bank Reconciliation Statement': 'Closing Balance as per Bank Statement', 'Amount (₹)': reconciliation.summary.closingBankBalance },
      { 'Bank Reconciliation Statement': '(+) Deposits in Transit (Uncleared Receipts)', 'Amount (₹)': reconciliation.summary.uncreditedDeposits },
      { 'Bank Reconciliation Statement': '(-) Unpresented Cheques (Issued but uncleared)', 'Amount (₹)': -reconciliation.summary.unpresentedChecks },
      { 'Bank Reconciliation Statement': '(=) Adjusted Bank Balance', 'Amount (₹)': reconciliation.summary.adjustedBankBalance },
      { 'Bank Reconciliation Statement': '', 'Amount (₹)': '' },
      { 'Bank Reconciliation Statement': 'Book / Ledger Side Adjustments', 'Amount (₹)': '' },
      { 'Bank Reconciliation Statement': 'Closing Balance as per Cash Book / Ledger', 'Amount (₹)': reconciliation.summary.closingLedgerBalance },
      { 'Bank Reconciliation Statement': '(+) Direct Bank Deposits & Interest Received', 'Amount (₹)': reconciliation.summary.bankDirectDeposits },
      { 'Bank Reconciliation Statement': '(-) Direct Bank Charges & Auto Debits', 'Amount (₹)': -reconciliation.summary.bankChargesOrDebits },
      { 'Bank Reconciliation Statement': '(=) Adjusted Book Balance', 'Amount (₹)': reconciliation.summary.adjustedBookBalance },
      { 'Bank Reconciliation Statement': '', 'Amount (₹)': '' },
      { 'Bank Reconciliation Statement': 'Reconciliation Difference (Should be 0.00)', 'Amount (₹)': reconciliation.summary.reconciliationDifference },
      { 'Bank Reconciliation Statement': 'Status', 'Amount (₹)': reconciliation.summary.isStatementReconciled ? 'RECONCILED (AGREED)' : 'VARIANCE DETECTED' },
    ];

    const matchedSheet = reconciliation.matches.map(m => ({
      'Match ID': m.id,
      'Match Confidence': `${m.confidence}%`,
      'Match Type': m.type,
      'Ambiguous Tie?': m.isAmbiguous ? 'YES - Manual Review Recommended' : 'No',
      'Match Reason': m.bank.matchReason,
      'Bank source': m.bank.sourceLabel, 'Bank row': m.bank.rowNumber, 'Ledger source': m.ledger.sourceLabel, 'Ledger row': m.ledger.rowNumber,
      'Bank Date': m.bank.date,
      'Bank Description': m.bank.description,
      'Bank Reference': m.bank.reference,
      'Bank Amount': m.bank.amount,
      'Ledger Date': m.ledger.date,
      'Ledger Description': m.ledger.description,
      'Ledger Reference': m.ledger.reference,
      'Ledger Amount': m.ledger.amount,
    }));

    const bankUnmatchedSheet = reconciliation.bankUnmatched.map(t => ({
      'Source': t.sourceLabel, 'Row': t.rowNumber,
      'Date': t.date,
      'Description': t.description,
      'Reference': t.reference,
      'Amount': t.amount,
      'Classification': 'Present in uploaded bank statement only — requires review',
    }));

    const ledgerUnmatchedSheet = reconciliation.ledgerUnmatched.map(t => ({
      'Source': t.sourceLabel, 'Row': t.rowNumber,
      'Date': t.date,
      'Description': t.description,
      'Reference': t.reference,
      'Amount': t.amount,
      'Classification': 'Present in uploaded ledger only — requires review',
    }));

    const blob = exportSpreadsheet({
      sheets: [
        { name: 'Import and settings', data: [
          { Setting: 'Bank source', Value: bankSource.label }, { Setting: 'Ledger source', Value: ledgerSource.label },
          { Setting: 'Date tolerance (days)', Value: dateToleranceDays }, { Setting: 'Amount tolerance', Value: 'Difference < 0.005 before rounded normalization' },
          { Setting: 'Matching scope', Value: 'Exact reference + amount; nearest date for duplicates. Otherwise date window OR description similarity >= 0.5. Ambiguities require review.' },
          { Setting: 'Supported import', Value: FINANCE_SCOPE },
          { Setting: 'Bank accepted', Value: reconciliation.summary.bankTotalTxns }, { Setting: 'Bank rejected', Value: rowErrors.bank.length },
          { Setting: 'Ledger accepted', Value: reconciliation.summary.ledgerTotalTxns }, { Setting: 'Ledger rejected', Value: rowErrors.ledger.length },
        ] },
        { name: 'Rejected rows', data: [['bank', bankData, bankSource.label], ['ledger', ledgerData, ledgerSource.label]].flatMap(([source, rows, label]) => rows.flatMap((row, index) => {
          const result = normalizeTransaction(row, CANONICAL_MAPPING, source, index);
          return result.error ? [{ Source: label, Row: row.__sourceRow ?? index + 1, Error: result.error, 'Original row (literal JSON)': JSON.stringify(row) }] : [];
        })) },
        { name: 'Reconciliation Statement', data: statementSheet },
        { name: 'Matched Items', data: matchedSheet },
        { name: 'Bank Unreconciled', data: bankUnmatchedSheet },
        { name: 'Ledger Unreconciled', data: ledgerUnmatchedSheet },
      ],
      format: 'xlsx',
    });

    downloadSpreadsheetBlob(blob, `Bank_Reconciliation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    trackExportClicked('xlsx');
  };

  const filteredMatches = useMemo(() => {
    if (!reconciliation) return [];
    let list = reconciliation.matches;
    if (activeTab === 'ambiguous') {
      list = list.filter(m => m.isAmbiguous);
    }
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(m =>
      m.bank.description.toLowerCase().includes(term) ||
      m.bank.reference.toLowerCase().includes(term) ||
      m.ledger.description.toLowerCase().includes(term) ||
      m.ledger.reference.toLowerCase().includes(term) ||
      String(m.bank.amount).includes(term)
    );
  }, [reconciliation, searchTerm, activeTab]);

  return (
    <div className="space-y-6">
      {/* Workspace Controls & Quick Demo trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--orbit-border)] bg-gradient-to-r from-accent-50/70 via-indigo-50/50 to-white dark:from-accent-950/20 dark:via-indigo-950/10 dark:to-stone-900 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-100 text-accent-800 dark:bg-accent-900/60 dark:text-accent-300">
          <Sparkles size={12} />
          Flagship Business Workflow
        </div>
        <button
          type="button"
          onClick={loadSampleDataset}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-[var(--orbit-border)] hover:bg-stone-50 dark:hover:bg-stone-750 shadow-xs transition"
        >
          <Sparkles size={14} className="text-amber-500" />
          Load Sample Dataset
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Row-level errors warning banner if malformed dates/amounts exist */}
      {(rowErrors.bank.length > 0 || rowErrors.ledger.length > 0) && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={14} className="shrink-0 text-amber-600" />
            <span>Row Validation Warnings ({rowErrors.bank.length + rowErrors.ledger.length} row(s) excluded due to invalid dates or amounts)</span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pl-5 list-disc font-mono text-[11px]">
            {rowErrors.bank.map((err, i) => (
              <div key={`bank-err-${i}`}>Bank: {err}</div>
            ))}
            {rowErrors.ledger.map((err, i) => (
              <div key={`ledger-err-${i}`}>Ledger: {err}</div>
            ))}
          </div>
        </div>
      )}

      <p role="status">{demo ? 'Demo mode — synthetic data. Activating a real file clears both demo sources and balances.' : bankData && ledgerData ? 'Ready — both sources supplied.' : 'Awaiting both sources. Confirm each import to enable reports.'}</p>
      <p className="text-sm">Bank statement: CR/deposit = money in; DR/withdrawal = money out. Ledger: DR/receipt = money in; CR/payment = money out. Explicit indicators take precedence over amount signs. Matching and balance agreement require review. Adjustment buckets assume unmatched ledger outflows are outstanding payments and inflows are deposits in transit; verify each classification.</p>
      <button className="orbit-control border rounded-lg" onClick={reset}>Reset workspace</button>
      <div className="grid md:grid-cols-2 gap-4">
        <FinanceFileImport key={`bank-${importEpoch}`} title="Bank statement" fields={BANK_FIELDS} detect={detectBankColumns} validate={validateBank} sample={SAMPLE_RECONCILIATION_DATA.bankRows} activeRows={bankData} activeLabel={bankSource?.label} onCommit={data => commit('bank', data)} onClear={() => setBankSource(null)} />
        <FinanceFileImport key={`ledger-${importEpoch}`} title="Accounting ledger" fields={BANK_FIELDS} detect={detectBankColumns} validate={validateLedger} sample={SAMPLE_RECONCILIATION_DATA.ledgerRows} activeRows={ledgerData} activeLabel={ledgerSource?.label} onCommit={data => commit('ledger', data)} onClear={() => setLedgerSource(null)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label>Closing bank balance (₹)<input aria-label="Closing bank balance" type="number" className="orbit-control w-full" value={closingBankBalance} onChange={e => setClosingBankBalance(e.target.value)} /></label>
        <label>Closing ledger balance (₹)<input aria-label="Closing ledger balance" type="number" className="orbit-control w-full" value={closingLedgerBalance} onChange={e => setClosingLedgerBalance(e.target.value)} /></label>
      </div>
      {reconciliation && <p role="status">Bank: {reconciliation.summary.bankTotalTxns} accepted / {rowErrors.bank.length} rejected. Ledger: {reconciliation.summary.ledgerTotalTxns} accepted / {rowErrors.ledger.length} rejected.</p>}

      {/* Date Tolerance & Engine Settings */}
      {bankData && ledgerData && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--orbit-border)] bg-stone-50/70 dark:bg-stone-850/60 text-xs">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="font-semibold text-stone-700 dark:text-stone-200">Matching Tolerance:</span>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span>Date window:</span>
              <select
                value={dateToleranceDays}
                onChange={e => setDateToleranceDays(Number(e.target.value))}
                className="orbit-control max-w-full rounded-lg border border-[var(--orbit-border)] bg-white dark:bg-stone-800 font-semibold text-stone-900 dark:text-stone-100"
              >
                <option value={0}>Exact Date Only</option>
                <option value={1}>+/- 1 Day</option>
                <option value={3}>+/- 3 Days (Standard)</option>
                <option value={7}>+/- 7 Days (Weekend/Holidays)</option>
                <option value={14}>+/- 14 Days</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!reconciliation} onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition cursor-pointer"
            >
              <Download size={13} />
              Export Reconciliation Statement (XLSX)
            </button>
            <button
              type="button"
              disabled={!reconciliation} onClick={() => openShareModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--orbit-border)] bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 font-medium text-xs shadow-xs transition cursor-pointer"
            >
              <Share2 size={13} className="text-accent-500" />
              Share Scorecard
            </button>
          </div>
        </div>
      )}

      {/* Reconciliation Dashboard & Results */}
      {reconciliation && (
        <div className="space-y-6 anim-fade-up">
          {/* Formal Bank Reconciliation Statement Card */}
          <div className={`anim-fade-up rounded-2xl border p-5 shadow-sm transition ${
            reconciliation.summary.isStatementReconciled
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--orbit-border)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Uploaded-file comparison</span>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  Bank Reconciliation Statement
                  {reconciliation.summary.isStatementReconciled ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                      <Check size={13} /> {reviewRequired ? 'Requires review' : 'Adjusted balances agree'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                      <AlertTriangle size={13} /> Variance Detected: ₹{Math.abs(reconciliation.summary.reconciliationDifference).toLocaleString('en-IN')}
                    </span>
                  )}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500 block">Statement Difference</span>
                <span className={`text-lg font-mono font-black ${
                  reconciliation.summary.isStatementReconciled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  ₹{reconciliation.summary.reconciliationDifference.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Left Column: Bank Side Adjustments */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wide text-[11px]">
                  Bank Balance Adjustments
                </h4>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="text-stone-600 dark:text-stone-400">Closing Balance per Bank Statement</span>
                  <span className="font-mono font-semibold">₹{reconciliation.summary.closingBankBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800 text-emerald-700 dark:text-emerald-400">
                  <span>(+) Deposits in Transit (Uncleared Receipts)</span>
                  <span className="font-mono font-semibold">+₹{reconciliation.summary.uncreditedDeposits.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800 text-rose-700 dark:text-rose-400">
                  <span>(-) Unpresented Cheques (Issued to Vendors)</span>
                  <span className="font-mono font-semibold">-₹{reconciliation.summary.unpresentedChecks.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-stone-900 dark:text-stone-100 text-sm bg-stone-100/60 dark:bg-stone-800/60 px-2 rounded-lg mt-2">
                  <span>(=) Adjusted Bank Balance</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{reconciliation.summary.adjustedBankBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Right Column: Book / Ledger Side Adjustments */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wide text-[11px]">
                  Book / Ledger Balance Adjustments
                </h4>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="text-stone-600 dark:text-stone-400">Closing Balance per Cash Book</span>
                  <span className="font-mono font-semibold">₹{reconciliation.summary.closingLedgerBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800 text-emerald-700 dark:text-emerald-400">
                  <span>(+) Direct Bank Deposits & Interest</span>
                  <span className="font-mono font-semibold">+₹{reconciliation.summary.bankDirectDeposits.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800 text-rose-700 dark:text-rose-400">
                  <span>(-) Direct Bank Charges & Taxes</span>
                  <span className="font-mono font-semibold">-₹{reconciliation.summary.bankChargesOrDebits.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-stone-900 dark:text-stone-100 text-sm bg-stone-100/60 dark:bg-stone-800/60 px-2 rounded-lg mt-2">
                  <span>(=) Adjusted Book Balance</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{reconciliation.summary.adjustedBookBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Match Rate</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-stone-900 dark:text-stone-100">
                  {reconciliation.summary.matchRatePercent}%
                </span>
                <span className="text-xs text-stone-500">
                  ({reconciliation.summary.matchedPairsCount} pairs)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Unpresented Cheques</span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                ₹{reconciliation.summary.unpresentedChecks.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-400">Issued in books, uncleared in bank</span>
            </div>

            <div className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Deposits in Transit</span>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                ₹{reconciliation.summary.uncreditedDeposits.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-400">Receipts pending bank credit</span>
            </div>

            <div className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Direct Bank Entries</span>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                ₹{(reconciliation.summary.bankChargesOrDebits + reconciliation.summary.bankDirectDeposits).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-400">Charges & direct interest in bank</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[var(--orbit-border)] pb-2">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('matched')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'matched'
                    ? 'bg-accent-600 text-white'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                Matched ({reconciliation.matches.length})
              </button>

              {reconciliation.summary.ambiguousMatchesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('ambiguous')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'ambiguous'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle size={12} />
                  Ambiguous Ties ({reconciliation.summary.ambiguousMatchesCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('bank_unmatched')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'bank_unmatched'
                    ? 'bg-accent-600 text-white'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                Bank Unmatched ({reconciliation.bankUnmatched.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ledger_unmatched')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'ledger_unmatched'
                    ? 'bg-accent-600 text-white'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                Ledger Unmatched ({reconciliation.ledgerUnmatched.length})
              </button>
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter transactions..."
              className="orbit-control rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 outline-none w-full sm:w-56"
            />
          </div>

          {/* Tab 1: Matched / Ambiguous Transactions Table */}
          {(activeTab === 'matched' || activeTab === 'ambiguous') && (
            <div className="overflow-x-auto rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--orbit-border)] bg-stone-50/80 dark:bg-stone-850/80 text-stone-500 font-bold">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Bank Details</th>
                    <th className="py-2.5 px-3">Ledger Details</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Confidence & Audit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--orbit-border)]">
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-400">No matching transactions found.</td>
                    </tr>
                  ) : (
                    filteredMatches.map(m => (
                      <tr key={m.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-850/50">
                        <td className="py-2.5 px-3 align-top">
                          {m.isAmbiguous ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                              <HelpCircle size={12} /> Ambiguous Tie
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={12} /> Matched
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-semibold text-stone-900 dark:text-stone-100">{m.bank.description}</div>
                          <div className="text-[10px] text-stone-400 font-mono">Date: {m.bank.date} {m.bank.reference && `| Ref: ${m.bank.reference}`}</div>
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-semibold text-stone-900 dark:text-stone-100">{m.ledger.description}</div>
                          <div className="text-[10px] text-stone-400 font-mono">Date: {m.ledger.date} {m.ledger.reference && `| Ref: ${m.ledger.reference}`}</div>
                        </td>
                        <td className="py-2.5 px-3 align-top text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                          ₹{m.bank.absAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 block">
                            {m.confidence}% match {m.isAmbiguous && '(Candidate Tie)'}
                          </span>
                          <span className="text-[10px] text-stone-400">{m.bank.matchReason}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Bank Unmatched */}
          {activeTab === 'bank_unmatched' && (
            <div className="overflow-x-auto rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--orbit-border)] bg-stone-50/80 dark:bg-stone-850/80 text-stone-500 font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--orbit-border)]">
                  {reconciliation.bankUnmatched.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-emerald-600 font-medium">All bank transactions reconciled!</td>
                    </tr>
                  ) : (
                    reconciliation.bankUnmatched.map(t => (
                      <tr key={t.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-850/50">
                        <td className="py-2.5 px-3 font-mono">{t.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-stone-100">{t.description}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-500">{t.reference || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.isMoneyIn
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {t.isMoneyIn ? 'Deposit' : 'Withdrawal'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                          ₹{t.absAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 text-[11px]">
                          {t.isMoneyIn ? 'Record customer wire or bank interest in books' : 'Post bank charges or direct debit entry'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Ledger Unmatched */}
          {activeTab === 'ledger_unmatched' && (
            <div className="overflow-x-auto rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--orbit-border)] bg-stone-50/80 dark:bg-stone-850/80 text-stone-500 font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Cheque / Voucher #</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Accounting Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--orbit-border)]">
                  {reconciliation.ledgerUnmatched.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-emerald-600 font-medium">All ledger records reconciled!</td>
                    </tr>
                  ) : (
                    reconciliation.ledgerUnmatched.map(t => (
                      <tr key={t.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-850/50">
                        <td className="py-2.5 px-3 font-mono">{t.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-stone-100">{t.description}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-500">{t.reference || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.isMoneyIn
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {t.isMoneyIn ? 'Receipt' : 'Payment'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                          ₹{t.absAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 text-[11px]">
                          {t.isMoneyIn ? 'Deposit in transit (awaiting bank clearance)' : 'Unpresented Cheque (issued, uncleared by vendor)'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
