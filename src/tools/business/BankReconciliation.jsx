import { useState, useMemo } from 'react';
import {
  Upload, CheckCircle2, AlertTriangle, Download, Sparkles, HelpCircle, Check
} from 'lucide-react';
import { parseSpreadsheet, exportSpreadsheet, downloadSpreadsheetBlob } from '../../engines/excelEngine';
import {
  normalizeTransaction,
  reconcileTransactions,
  SAMPLE_RECONCILIATION_DATA,
} from '../../engines/bankReconciliationEngine';

export default function BankReconciliation() {
  const [bankFile, setBankFile] = useState(null);
  const [bankData, setBankData] = useState(null);
  const [bankHeaders, setBankHeaders] = useState([]);
  const [bankMapping, setBankMapping] = useState({
    date: '',
    description: '',
    reference: '',
    credit: '', // Deposit / Money In
    debit: '',  // Withdrawal / Money Out
    amount: '',
  });

  const [ledgerFile, setLedgerFile] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerHeaders, setLedgerHeaders] = useState([]);
  const [ledgerMapping, setLedgerMapping] = useState({
    date: '',
    description: '',
    reference: '',
    debit: '',  // Receipt / Money In
    credit: '', // Payment / Money Out
    amount: '',
  });

  const [closingBankBalance, setClosingBankBalance] = useState('244990');
  const [closingLedgerBalance, setClosingLedgerBalance] = useState('268550');

  const [dateToleranceDays, setDateToleranceDays] = useState(3);
  const [activeTab, setActiveTab] = useState('matched'); // 'statement' | 'matched' | 'ambiguous' | 'bank_unmatched' | 'ledger_unmatched'
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Auto-detect column mappings from headers
  const autoDetectBankMapping = (headers) => {
    const map = { date: '', description: '', reference: '', credit: '', debit: '', amount: '' };
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (!map.date && (lower.includes('date') || lower.includes('dt'))) map.date = h;
      if (!map.description && (lower.includes('desc') || lower.includes('narration') || lower.includes('particular') || lower.includes('details'))) map.description = h;
      if (!map.reference && (lower.includes('ref') || lower.includes('chk') || lower.includes('cheque') || lower.includes('utr') || lower.includes('txn'))) map.reference = h;
      if (!map.credit && (lower.includes('deposit') || lower.includes('credit') || lower.includes('cr') || lower.includes('inward'))) map.credit = h;
      if (!map.debit && (lower.includes('withdraw') || lower.includes('debit') || lower.includes('dr') || lower.includes('outward'))) map.debit = h;
      if (!map.amount && (lower.includes('amount') || lower.includes('amt') || lower.includes('sum'))) map.amount = h;
    });
    return map;
  };

  const autoDetectLedgerMapping = (headers) => {
    const map = { date: '', description: '', reference: '', debit: '', credit: '', amount: '' };
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (!map.date && (lower.includes('date') || lower.includes('dt'))) map.date = h;
      if (!map.description && (lower.includes('desc') || lower.includes('account') || lower.includes('party') || lower.includes('particular'))) map.description = h;
      if (!map.reference && (lower.includes('ref') || lower.includes('chk') || lower.includes('cheque') || lower.includes('voucher') || lower.includes('bill'))) map.reference = h;
      if (!map.debit && (lower.includes('receipt') || lower.includes('debit') || lower.includes('dr') || lower.includes('received'))) map.debit = h;
      if (!map.credit && (lower.includes('payment') || lower.includes('credit') || lower.includes('cr') || lower.includes('paid'))) map.credit = h;
      if (!map.amount && (lower.includes('amount') || lower.includes('amt'))) map.amount = h;
    });
    return map;
  };

  const handleBankUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      setBankFile(file.name);
      const parsed = await parseSpreadsheet(file);
      setBankData(parsed.rows);
      setBankHeaders(parsed.headers);
      setBankMapping(autoDetectBankMapping(parsed.headers));
    } catch (err) {
      setError(`Failed to read bank statement: ${err.message}`);
    }
  };

  const handleLedgerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      setLedgerFile(file.name);
      const parsed = await parseSpreadsheet(file);
      setLedgerData(parsed.rows);
      setLedgerHeaders(parsed.headers);
      setLedgerMapping(autoDetectLedgerMapping(parsed.headers));
    } catch (err) {
      setError(`Failed to read accounting ledger: ${err.message}`);
    }
  };

  // Load 1-click sample demo dataset
  const loadSampleDataset = () => {
    setError(null);
    setBankFile('Q1_Corporate_Bank_Statement.xlsx');
    setBankData(SAMPLE_RECONCILIATION_DATA.bankRows);
    setBankHeaders(['Date', 'Description', 'Reference', 'Deposit', 'Withdrawal', 'Balance']);
    setBankMapping({ date: 'Date', description: 'Description', reference: 'Reference', credit: 'Deposit', debit: 'Withdrawal', amount: '' });
    setClosingBankBalance(String(SAMPLE_RECONCILIATION_DATA.closingBankBalance));

    setLedgerFile('Q1_Cash_Book_Ledger.xlsx');
    setLedgerData(SAMPLE_RECONCILIATION_DATA.ledgerRows);
    setLedgerHeaders(['Date', 'Description', 'Reference', 'Receipt', 'Payment', 'Balance']);
    setLedgerMapping({ date: 'Date', description: 'Description', reference: 'Reference', debit: 'Receipt', credit: 'Payment', amount: '' });
    setClosingLedgerBalance(String(SAMPLE_RECONCILIATION_DATA.closingLedgerBalance));
  };

  // Perform reconciliation & calculate row errors
  const { reconciliation, rowErrors } = useMemo(() => {
    if (!bankData || !ledgerData || bankData.length === 0 || ledgerData.length === 0) {
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
        dateToleranceDays: Number(dateToleranceDays) || 3,
        closingBankBalance: parseFloat(closingBankBalance) || 0,
        closingLedgerBalance: parseFloat(closingLedgerBalance) || 0,
      });

      return {
        reconciliation: rec,
        rowErrors: { bank: bankErrList, ledger: ledgerErrList },
      };
    } catch {
      return { reconciliation: null, rowErrors: { bank: [], ledger: [] } };
    }
  }, [bankData, ledgerData, bankMapping, ledgerMapping, dateToleranceDays, closingBankBalance, closingLedgerBalance]);

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
      'Date': t.date,
      'Description': t.description,
      'Reference': t.reference,
      'Amount': t.amount,
      'Classification': t.isMoneyIn ? 'Direct Bank Deposit (Customer Wire / Interest)' : 'Direct Bank Debit (Service Charges / Tax)',
    }));

    const ledgerUnmatchedSheet = reconciliation.ledgerUnmatched.map(t => ({
      'Date': t.date,
      'Description': t.description,
      'Reference': t.reference,
      'Amount': t.amount,
      'Classification': t.isMoneyIn ? 'Deposit in Transit / Uncredited' : 'Outstanding / Unpresented Cheque',
    }));

    const blob = exportSpreadsheet({
      sheets: [
        { name: 'Reconciliation Statement', data: statementSheet },
        { name: 'Matched Items', data: matchedSheet },
        { name: 'Bank Unreconciled', data: bankUnmatchedSheet },
        { name: 'Ledger Unreconciled', data: ledgerUnmatchedSheet },
      ],
      format: 'xlsx',
    });

    downloadSpreadsheetBlob(blob, `Bank_Reconciliation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      {/* Top Banner & Quick Demo trigger */}
      <div className="rounded-2xl border border-[var(--orbit-border)] bg-gradient-to-r from-accent-50/70 via-indigo-50/50 to-white dark:from-accent-950/20 dark:via-indigo-950/10 dark:to-stone-900 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-800 dark:bg-accent-900/60 dark:text-accent-300 mb-2">
              <Sparkles size={12} />
              Flagship Business Workflow
            </div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Automated Bank Statement & Ledger Reconciliation
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1 max-w-2xl">
              Reconcile bank statements and bookkeeping cash books with accounting rigor. Generates a formal Bank Reconciliation Statement, detects timing differences (deposits in transit, unpresented cheques), and flags ambiguous ties for audit review.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSampleDataset}
            className="self-start md:self-auto shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-[var(--orbit-border)] hover:bg-stone-50 dark:hover:bg-stone-750 shadow-sm transition"
          >
            <Sparkles size={14} className="text-amber-500" />
            Load Sample Dataset
          </button>
        </div>
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

      {/* Upload & Column Mapping Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Bank Statement */}
        <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs">
                1
              </span>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Bank Statement (Bank Portal)
              </h3>
            </div>
            {bankData && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                {bankData.length} txns loaded
              </span>
            )}
          </div>

          <label className="border-2 border-dashed border-[var(--orbit-border)] hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-stone-50/50 dark:bg-stone-850/50 transition">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBankUpload} className="hidden" />
            <Upload size={20} className="text-stone-400 mb-1" />
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              {bankFile ? bankFile : 'Upload Bank Statement (XLSX / CSV)'}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5">Click or drag file here</span>
          </label>

          {bankHeaders.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[var(--orbit-border)]">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Detected Column Mapping</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Date Column</label>
                  <select
                    value={bankMapping.date}
                    onChange={e => setBankMapping(m => ({ ...m, date: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value="">Select...</option>
                    {bankHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Ref / Cheque #</label>
                  <select
                    value={bankMapping.reference}
                    onChange={e => setBankMapping(m => ({ ...m, reference: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value="">Select (Optional)...</option>
                    {bankHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Deposit (Credit / In)</label>
                  <select
                    value={bankMapping.credit}
                    onChange={e => setBankMapping(m => ({ ...m, credit: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value="">Select...</option>
                    {bankHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Withdrawal (Debit / Out)</label>
                  <select
                    value={bankMapping.debit}
                    onChange={e => setBankMapping(m => ({ ...m, debit: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value="">Select...</option>
                    {bankHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block mb-1">
                  Closing Bank Statement Balance (₹)
                </label>
                <input
                  type="number"
                  value={closingBankBalance}
                  onChange={e => setClosingBankBalance(e.target.value)}
                  placeholder="e.g. 244990"
                  className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs font-mono font-semibold text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Cash Book / Accounting Ledger */}
        <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                2
              </span>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Accounting Ledger (Cash Book)
              </h3>
            </div>
            {ledgerData && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                {ledgerData.length} txns loaded
              </span>
            )}
          </div>

          <label className="border-2 border-dashed border-[var(--orbit-border)] hover:border-emerald-400 dark:hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-stone-50/50 dark:bg-stone-850/50 transition">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleLedgerUpload} className="hidden" />
            <Upload size={20} className="text-stone-400 mb-1" />
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              {ledgerFile ? ledgerFile : 'Upload Accounting Ledger (XLSX / CSV)'}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5">Click or drag file here</span>
          </label>

          {ledgerHeaders.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[var(--orbit-border)]">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Detected Column Mapping</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Date Column</label>
                  <select
                    value={ledgerMapping.date}
                    onChange={e => setLedgerMapping(m => ({ ...m, date: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value="">Select...</option>
                    {ledgerHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Ref / Voucher #</label>
                  <select
                    value={ledgerMapping.reference}
                    onChange={e => setLedgerMapping(m => ({ ...m, reference: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value="">Select (Optional)...</option>
                    {ledgerHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Receipt (Debit / In)</label>
                  <select
                    value={ledgerMapping.debit}
                    onChange={e => setLedgerMapping(m => ({ ...m, debit: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value="">Select...</option>
                    {ledgerHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-0.5">Payment (Credit / Out)</label>
                  <select
                    value={ledgerMapping.credit}
                    onChange={e => setLedgerMapping(m => ({ ...m, credit: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value="">Select...</option>
                    {ledgerHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block mb-1">
                  Closing Ledger / Cash Book Balance (₹)
                </label>
                <input
                  type="number"
                  value={closingLedgerBalance}
                  onChange={e => setClosingLedgerBalance(e.target.value)}
                  placeholder="e.g. 268550"
                  className="w-full rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 p-1.5 text-xs font-mono font-semibold text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Tolerance & Engine Settings */}
      {bankData && ledgerData && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--orbit-border)] bg-stone-50/70 dark:bg-stone-850/60 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-stone-700 dark:text-stone-200">Matching Tolerance:</span>
            <div className="flex items-center gap-1.5">
              <span>Date window:</span>
              <select
                value={dateToleranceDays}
                onChange={e => setDateToleranceDays(Number(e.target.value))}
                className="rounded-lg border border-[var(--orbit-border)] bg-white dark:bg-stone-800 px-2 py-1 font-semibold text-stone-900 dark:text-stone-100"
              >
                <option value={0}>Exact Date Only</option>
                <option value={1}>+/- 1 Day</option>
                <option value={3}>+/- 3 Days (Standard)</option>
                <option value={7}>+/- 7 Days (Weekend/Holidays)</option>
                <option value={14}>+/- 14 Days</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition"
          >
            <Download size={13} />
            Export Reconciliation Statement (XLSX)
          </button>
        </div>
      )}

      {/* Reconciliation Dashboard & Results */}
      {reconciliation && (
        <div className="space-y-6">
          {/* Formal Bank Reconciliation Statement Card */}
          <div className={`rounded-2xl border p-5 shadow-sm transition ${
            reconciliation.summary.isStatementReconciled
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--orbit-border)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Statutory Accounting Report</span>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  Bank Reconciliation Statement
                  {reconciliation.summary.isStatementReconciled ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                      <Check size={13} /> Reconciled & Agreed
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
              className="rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-850 px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 outline-none w-full sm:w-56"
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
