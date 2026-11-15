import { moneyPaise, sumMoney, strictDate } from './financeValidation.js';
/**
 * Bank Reconciliation Engine
 * High-precision reconciliation between Bank Statements and Accounting Ledgers.
 * Follows standard double-entry accounting reconciliation principles.
 */

/**
 * Standardize transaction records for reconciliation.
 * Normalizes sign convention:
 * - Deposits/Receipts (Money In) -> positive amount
 * - Withdrawals/Payments (Money Out) -> negative amount
 *
 * @param {Object} row Raw spreadsheet row object
 * @param {Object} mapping Column mappings
 * @param {'bank'|'ledger'} source
 * @param {number} rowIndex 0-based index of row
 * @returns {{ transaction: Object|null, error: string|null }}
 */
export function normalizeTransaction(row, mapping, source = 'bank', rowIndex = 0) {
  const rowNum = row.__sourceRow ?? rowIndex + 1;
  const dateStr = String(row[mapping.date] || '').trim();

  if (!dateStr) {
    return {
      transaction: null,
      error: `Row ${rowNum}: Date is missing or empty.`,
    };
  }

  const dateObj = parseValidDate(row[mapping.date]);
  if (!dateObj) {
    return {
      transaction: null,
      error: `Row ${rowNum}: Invalid date format "${dateStr}". Expected valid date (YYYY-MM-DD or DD/MM/YYYY).`,
    };
  }

  if (String(row[mapping.description] ?? '').length > 1000 || String(row[mapping.reference] ?? '').length > 256) return { transaction:null,error:`Row ${rowNum}: Reference exceeds 256 characters or description exceeds 1,000 characters. Shorten it before matching.` };

  const ref = String(row[mapping.reference] ?? '').trim();
  const desc = String(row[mapping.description] || '').trim();

  let amount;
  let hasValidAmount;

  // Case 1: Separate Debit & Credit columns
  if (mapping.debit && mapping.credit && (row[mapping.debit] !== undefined || row[mapping.credit] !== undefined)) {
    const rawDebit = row[mapping.debit];
    const rawCredit = row[mapping.credit];

    const hasDebit = rawDebit !== undefined && rawDebit !== null && String(rawDebit).trim() !== '';
    const hasCredit = rawCredit !== undefined && rawCredit !== null && String(rawCredit).trim() !== '';

    if (!hasDebit && !hasCredit) {
      return {
        transaction: null,
        error: `Row ${rowNum}: Neither debit nor credit amount provided.`,
      };
    }

    const debit = parseAmount(rawDebit);
    const credit = parseAmount(rawCredit);

    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0 || (debit > 0 && credit > 0) || mapping.debit === mapping.credit) {
      return {
        transaction: null,
        error: `Row ${rowNum}: Amount contains invalid non-numeric characters or conflicting debit/credit values. Debit/credit must be finite non-negative amounts in distinct columns; only one may be non-zero.`,
      };
    }

    if (source === 'bank') {
      // In bank statements:
      // Credit = Deposit (Money In = positive)
      // Debit = Withdrawal (Money Out = negative)
      amount = credit > 0 ? credit : -debit;
    } else {
      // In cash books / accounting ledgers:
      // Debit = Receipt (Money In = positive)
      // Credit = Payment (Money Out = negative)
      amount = debit > 0 ? debit : -credit;
    }
    hasValidAmount = true;
  } else if (mapping.amount) {
    // Case 2: Single Amount column with optional Type indicator
    const rawVal = row[mapping.amount];
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      return {
        transaction: null,
        error: `Row ${rowNum}: Amount is missing or empty.`,
      };
    }

    const rawAmt = parseAmount(rawVal);
    if (!Number.isFinite(rawAmt)) {
      return {
        transaction: null,
        error: `Row ${rowNum}: Invalid amount "${rawVal}".`,
      };
    }

    const type = String(row[mapping.type] || '').toUpperCase().trim();

    const words = type.split(/[^A-Z]+/).filter(Boolean);
    const incoming = words.some(w => ['RECEIPT', 'REC', 'DEPOSIT', 'DEP', ...(source === 'bank' ? ['CR', 'CREDIT'] : ['DR', 'DEBIT'])].includes(w));
    const outgoing = words.some(w => ['PAYMENT', 'PAY', 'WITHDRAWAL', ...(source === 'bank' ? ['DR', 'DEBIT'] : ['CR', 'CREDIT'])].includes(w));
    if ((incoming && outgoing) || (type && !incoming && !outgoing)) return { transaction: null, error: `Row ${rowNum}: Conflicting or unsupported direction indicator.` };
    // Positive magnitudes are common even for withdrawals. Explicit type wins.
    amount = incoming ? Math.abs(rawAmt) : outgoing ? -Math.abs(rawAmt) : rawAmt;
    hasValidAmount = true;
  } else {
    return {
      transaction: null,
      error: `Row ${rowNum}: No amount column mapped.`,
    };
  }

  // Cross-check a separately supplied type against debit/credit direction.
  const indicator = String(row[mapping.type] ?? '').trim().toUpperCase();
  if (indicator) {
    const words = indicator.split(/[^A-Z]+/).filter(Boolean);
    const ins = new Set(['RECEIPT', 'REC', 'DEPOSIT', 'DEP', ...(source === 'bank' ? ['CR', 'CREDIT'] : ['DR', 'DEBIT'])]);
    const outs = new Set(['PAYMENT', 'PAY', 'WITHDRAWAL', ...(source === 'bank' ? ['DR', 'DEBIT'] : ['CR', 'CREDIT'])]);
    const incoming = words.some(w => ins.has(w)), outgoing = words.some(w => outs.has(w));
    if (incoming === outgoing || words.some(w => !ins.has(w) && !outs.has(w)) || (incoming && amount < 0) || (outgoing && amount > 0)) return { transaction: null, error: `Row ${rowNum}: Conflicting or unsupported direction indicator.` };
  }
  if (!Number.isFinite(amount) || Math.abs(amount) > 1e12) return { transaction: null, error: `Row ${rowNum}: Amount must be finite and at most 1 trillion in magnitude.` };
  if (amount !== 0 && Math.round(Math.abs(amount) * 100) === 0) return { transaction: null, error: `Row ${rowNum}: Amount rounds to zero at two decimals.` };

  if (!hasValidAmount || amount === 0) {
    return {
      transaction: null,
      error: `Row ${rowNum}: Transaction amount cannot be zero.`,
    };
  }

  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  const dateFormatted = `${y}-${m}-${d}`;

  const deterministicId = `${source}-row${rowNum}-${hashDeterministic(ref + '|' + dateFormatted + '|' + amount)}`;

  return {
    transaction: {
      id: deterministicId,
      rowIndex,
      rowNumber: rowNum,
      source,
      sourceLabel: row.__sourceLabel ?? source,
      raw: row,
      date: dateFormatted,
      dateObj,
      description: desc,
      reference: ref,
      amount, // Already rounded once to integer paise by parseAmount
      absAmount: Math.abs(amount),
      isMoneyIn: amount >= 0,
      reconciled: false,
      matchedId: null,
      matchConfidence: 0,
      matchReason: '',
      isAmbiguous: false,
      competingCandidateCount: 0,
    },
    error: null,
  };
}

/**
 * Parses diverse date formats into a valid Date object.
 * Rejects invalid strings without silent fallbacks.
 */
export function parseValidDate(value) {
  const date = strictDate(value);
  return date ? new Date(`${date}T00:00:00Z`) : null;
}
export function parseAmount(value) { return moneyPaise(value, 0) / 100; }

function hashDeterministic(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Reconcile normalized bank transactions against normalized ledger transactions.
 * Uses a scored ranking system and flags ambiguous ties for manual review.
 *
 * @param {Array} bankTxns
 * @param {Array} ledgerTxns
 * @param {Object} options
 * @param {number} [options.dateToleranceDays=3]
 * @param {number} [options.closingBankBalance=0]
 * @param {number} [options.closingLedgerBalance=0]
 * @param {number} [options.openingBankBalance=0]
 * @param {number} [options.openingLedgerBalance=0]
 */
export function reconcileTransactions(bankTxns, ledgerTxns, options = {}) {
  if (bankTxns.length > 2000 || ledgerTxns.length > 2000) throw new Error('Bank reconciliation supports up to 2,000 rows per source. Split the period and retry.');
  if (bankTxns.length * ledgerTxns.length > 500000) throw new Error('This bank/ledger combination exceeds 5 lakh candidate comparisons. Split both files into smaller matching periods.');
  const dateToleranceDays = options.dateToleranceDays ?? 3;
  if (!Number.isInteger(dateToleranceDays) || dateToleranceDays < 0 || dateToleranceDays > 30) throw new Error('Date tolerance must be a whole number from 0 to 30 days.');
  const closingBankBalance = moneyPaise(options.closingBankBalance ?? 0) / 100;
  const closingLedgerBalance = moneyPaise(options.closingLedgerBalance ?? 0) / 100;
  if (![closingBankBalance, closingLedgerBalance].every(Number.isFinite)) throw new Error('Enter valid closing balances.');

  const bank = bankTxns.map(t => ({ ...t, reconciled: false, matchedId: null, isAmbiguous:false, matchConfidence:0, matchReason:'', competingCandidateCount:0 }));
  const ledger = ledgerTxns.map(t => ({ ...t, reconciled: false, matchedId: null, isAmbiguous:false, matchConfidence:0, matchReason:'', competingCandidateCount:0 }));

  const matches = [];

  // Proposals are calculated against the complete candidate set. A proposal is
  // confirmed only if it is unique in BOTH directions. Ties never consume rows.
  const proposals = bank.map(b => {
    const equal = ledger.filter(l => l.isMoneyIn === b.isMoneyIn && moneyPaise(l.amount) === moneyPaise(b.amount));
    const exact = equal.filter(l => b.reference && l.reference && l.reference.toLowerCase() === b.reference.toLowerCase());
    const ranked = (exact.length ? exact : equal).map(candidate => {
      const days = Math.abs(candidate.dateObj - b.dateObj) / 86400000;
      const similarity = calculateTokenSimilarity(b.description, candidate.description).score;
      return { candidate, days, score: exact.length ? 1000 - days : (days <= dateToleranceDays ? 100 - days * 40 / Math.max(1,dateToleranceDays) : 0) + (similarity >= .5 ? similarity * 50 : 0) };
    }).filter(c => exact.length || c.days <= dateToleranceDays || c.score > 0).sort((a,c) => c.score - a.score || a.candidate.id.localeCompare(c.candidate.id));
    if (!ranked.length) return null;
    const top = ranked[0];
    return { b, ranked, top, exact: Boolean(exact.length), tied: ranked.length > 1 && Math.abs(top.score - ranked[1].score) < (exact.length ? .001 : 5) };
  }).filter(Boolean);
  const claims = new Map();
  for (const p of proposals) for (const c of p.ranked.filter(c => p.top.score - c.score < (p.exact ? .001 : 5))) {
    claims.set(c.candidate.id, (claims.get(c.candidate.id) || 0) + 1);
  }
  for (const {b, ranked, top, tied, exact} of proposals) {
    const l = top.candidate;
    const ambiguous = tied || claims.get(l.id) > 1;
    const reason = ambiguous ? 'Ambiguous candidates: no pair confirmed; review both sources.' : exact ? 'Exact Reference & Amount Match' : 'Exact Amount & Date/Description Candidate';
    b.isAmbiguous = ambiguous; b.competingCandidateCount = ranked.length;
    b.matchReason = reason; b.matchConfidence = ambiguous ? 0 : exact ? 100 : 90;
    if (!ambiguous) {
      b.reconciled = l.reconciled = true; b.matchedId = l.id; l.matchedId = b.id;
      l.matchReason = reason; l.matchConfidence = b.matchConfidence;
    }
    matches.push({ id:`match-${b.id}-${l.id}`, bank:b, ledger:l,
      type:exact ? 'exact_ref' : 'date_amount', confidence:b.matchConfidence,
      isAmbiguous:ambiguous, candidateCount:ranked.length,
      candidates:ranked.map(c=>({id:c.candidate.id,rowNumber:c.candidate.rowNumber,date:c.candidate.date,reference:c.candidate.reference})), difference:0 });
  }

  // Financial Figures & Standard Accounting Bank Reconciliation Statement
  const bankMatched = bank.filter(t => t.reconciled);
  const bankUnmatched = bank.filter(t => !t.reconciled);
  const ledgerMatched = ledger.filter(t => t.reconciled);
  const ledgerUnmatched = ledger.filter(t => !t.reconciled);

  const bankTotalTxnAmt = sumMoney(bank.map(t => t.amount));
  const ledgerTotalTxnAmt = sumMoney(ledger.map(t => t.amount));

  // Bank entries not recorded in Books
  const bankChargesOrDebits = sumMoney(bankUnmatched.filter(t => !t.isMoneyIn).map(t => t.absAmount));
  const bankDirectDeposits = sumMoney(bankUnmatched.filter(t => t.isMoneyIn).map(t => t.absAmount));

  // Book entries not cleared by Bank
  const unpresentedChecks = sumMoney(ledgerUnmatched.filter(t => !t.isMoneyIn).map(t => t.absAmount));
  const uncreditedDeposits = sumMoney(ledgerUnmatched.filter(t => t.isMoneyIn).map(t => t.absAmount));

  // Formal Bank Reconciliation Statement:
  // 1. Adjusted Bank Balance = Closing Bank Balance + Deposits in Transit - Outstanding Cheques
  const adjustedBankBalance = sumMoney([closingBankBalance, uncreditedDeposits, -unpresentedChecks]);

  // 2. Adjusted Book Balance = Closing Book Balance + Direct Bank Deposits - Direct Bank Charges
  const adjustedBookBalance = sumMoney([closingLedgerBalance, bankDirectDeposits, -bankChargesOrDebits]);

  // True reconciliation difference (Adjusted Bank Balance vs Adjusted Book Balance)
  const reconciliationDifference = sumMoney([adjustedBankBalance, -adjustedBookBalance]);
  const isStatementReconciled = reconciliationDifference === 0 && !matches.some(m => m.isAmbiguous);

  const netTxnVariance = sumMoney([bankTotalTxnAmt, -ledgerTotalTxnAmt]);
  const matchRate = (bank.length + ledger.length) > 0
    ? Math.round(((bankMatched.length + ledgerMatched.length) / (bank.length + ledger.length)) * 100)
    : 0;

  const ambiguousCount = matches.filter(m => m.isAmbiguous).length;

  return {
    matches,
    bankMatched,
    bankUnmatched,
    ledgerMatched,
    ledgerUnmatched,
    summary: {
      bankTotalTxns: bank.length,
      ledgerTotalTxns: ledger.length,
      matchedPairsCount: matches.filter(m => !m.isAmbiguous).length,
      bankUnmatchedCount: bankUnmatched.length,
      ledgerUnmatchedCount: ledgerUnmatched.length,
      ambiguousMatchesCount: ambiguousCount,
      matchRatePercent: matchRate,
      // Input Balances
      closingBankBalance,
      closingLedgerBalance,
      // Timing & Book adjustments
      unpresentedChecks,
      uncreditedDeposits,
      bankChargesOrDebits,
      bankDirectDeposits,
      // Reconciled Balances
      adjustedBankBalance,
      adjustedBookBalance,
      reconciliationDifference,
      isStatementReconciled,
      // Diagnostic sums
      bankTotalTxnAmt,
      ledgerTotalTxnAmt,
      netTxnVariance,
    },
  };
}

/**
 * Calculates Token Jaccard & overlap similarity between two narrations.
 * Ignores trivial stop words and requires at least 2 significant token matches.
 */
export function calculateTokenSimilarity(strA, strB) {
  const wordsA = extractSignificantWords(strA);
  const wordsB = extractSignificantWords(strB);

  if (wordsA.length === 0 || wordsB.length === 0) {
    return { score: 0, sharedWords: [] };
  }

  const setB = new Set(wordsB);
  const shared = wordsA.filter(w => setB.has(w));
  const uniqueShared = [...new Set(shared)];

  const unionSize = new Set([...wordsA, ...wordsB]).size;
  const jaccard = unionSize > 0 ? uniqueShared.length / unionSize : 0;

  // We require at least 2 significant words
  const isSignificant = uniqueShared.length >= 2;

  return {
    score: isSignificant ? jaccard : 0,
    sharedWords: uniqueShared,
    tokenCountA: wordsA.length,
    tokenCountB: wordsB.length,
  };
}

function extractSignificantWords(str) {
  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'pvt', 'ltd', 'inc', 'corp', 'txn', 'transfer', 'payment',
    'neft', 'rtgs', 'imps', 'upi', 'to', 'from', 'a', 'an', 'in', 'on', 'of', 'by',
    'bill', 'inv', 'ref', 'chq', 'cheque', 'dr', 'cr', 'via', 'ac', 'account'
  ]);

  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}


/**
 * Built-in Sample Datasets for 1-click Demo
 * With balanced Closing Balances ($270,790 Adjusted Balance).
 */
export const SAMPLE_RECONCILIATION_DATA = {
  closingBankBalance: 244990,
  closingLedgerBalance: 268550,
  bankRows: [
    { Date: '2025-03-01', Description: 'Customer Wire ACME Corp', Reference: 'TXN-8821', Deposit: 125000, Withdrawal: '', Balance: 325000 },
    { Date: '2025-03-03', Description: 'AWS Cloud Hosting Services', Reference: 'INV-4011', Deposit: '', Withdrawal: 14250, Balance: 310750 },
    { Date: '2025-03-05', Description: 'Vendor Payment TechSupply Inc', Reference: 'CHK-1002', Deposit: '', Withdrawal: 48000, Balance: 262750 },
    { Date: '2025-03-08', Description: 'Client Retainer Globex Corp', Reference: 'TXN-8844', Deposit: 65000, Withdrawal: '', Balance: 327750 },
    { Date: '2025-03-12', Description: 'Monthly Office Lease RealEstate Ltd', Reference: 'CHK-1004', Deposit: '', Withdrawal: 85000, Balance: 242750 },
    { Date: '2025-03-15', Description: 'Bank Service Charges & GST', Reference: 'BK-CHG-03', Deposit: '', Withdrawal: 1180, Balance: 241570 },
    { Date: '2025-03-18', Description: 'Direct Interest Credited by Bank', Reference: 'INT-Q1', Deposit: 3420, Withdrawal: '', Balance: 244990 },
  ],
  ledgerRows: [
    { Date: '2025-03-01', Description: 'ACME Corp Invoice #402', Reference: 'TXN-8821', Receipt: 125000, Payment: '', Balance: 125000 },
    { Date: '2025-03-02', Description: 'AWS Monthly Cloud Bill', Reference: 'INV-4011', Receipt: '', Payment: 14250, Balance: 110750 },
    { Date: '2025-03-04', Description: 'TechSupply Cheque #1002', Reference: 'CHK-1002', Receipt: '', Payment: 48000, Balance: 62750 },
    { Date: '2025-03-08', Description: 'Globex Consulting Retainer', Reference: 'TXN-8844', Receipt: 65000, Payment: '', Balance: 127750 },
    { Date: '2025-03-11', Description: 'Office Rent Cheque #1004', Reference: 'CHK-1004', Receipt: '', Payment: 85000, Balance: 42750 },
    { Date: '2025-03-25', Description: 'Stationery Supplies Cheque #1005', Reference: 'CHK-1005', Receipt: '', Payment: 6200, Balance: 36550 },
    { Date: '2025-03-28', Description: 'Zenith Labs Deposit in transit', Reference: 'DEP-909', Receipt: 32000, Payment: '', Balance: 68550 },
  ],
};
