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
  const rowNum = rowIndex + 1;
  const dateStr = String(row[mapping.date] || '').trim();

  if (!dateStr) {
    return {
      transaction: null,
      error: `Row ${rowNum}: Date is missing or empty.`,
    };
  }

  const dateObj = parseValidDate(dateStr);
  if (!dateObj) {
    return {
      transaction: null,
      error: `Row ${rowNum}: Invalid date format "${dateStr}". Expected valid date (YYYY-MM-DD or DD/MM/YYYY).`,
    };
  }

  const ref = String(row[mapping.reference] || '').trim();
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

    if (isNaN(debit) || isNaN(credit)) {
      return {
        transaction: null,
        error: `Row ${rowNum}: Amount contains invalid non-numeric characters.`,
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
    if (isNaN(rawAmt)) {
      return {
        transaction: null,
        error: `Row ${rowNum}: Invalid amount "${rawVal}".`,
      };
    }

    const type = String(row[mapping.type] || '').toUpperCase().trim();

    if (source === 'bank') {
      if (type.includes('CR') || type.includes('DEP') || rawAmt > 0) {
        amount = Math.abs(rawAmt);
      } else {
        amount = -Math.abs(rawAmt);
      }
    } else {
      if (type.includes('DR') || type.includes('REC') || rawAmt > 0) {
        amount = Math.abs(rawAmt);
      } else {
        amount = -Math.abs(rawAmt);
      }
    }
    hasValidAmount = true;
  } else {
    return {
      transaction: null,
      error: `Row ${rowNum}: No amount column mapped.`,
    };
  }

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
      raw: row,
      date: dateFormatted,
      dateObj,
      description: desc,
      reference: ref,
      amount: Math.round(amount * 100) / 100, // Two decimals precision
      absAmount: Math.round(Math.abs(amount) * 100) / 100,
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
export function parseValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' && typeof dateStr !== 'number' && !(dateStr instanceof Date)) {
    return null;
  }

  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
    return dateStr;
  }

  // Handle Excel serial date numbers (e.g. 45678)
  if (typeof dateStr === 'number' || (!isNaN(Number(dateStr)) && !String(dateStr).includes('-') && !String(dateStr).includes('/'))) {
    const serial = Number(dateStr);
    if (serial > 1000 && serial < 100000) {
      // Excel epoch starts 1899-12-30 (accounting for 1900 leap year bug)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsed = new Date(excelEpoch.getTime() + serial * 86400000);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  const s = String(dateStr).trim();

  // Try standard ISO (YYYY-MM-DD)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day) {
      return d;
    }
    return null;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day) {
      return d;
    }
  }

  // General Date.parse (fallback for other textual formats)
  const general = new Date(s);
  return !isNaN(general.getTime()) ? general : null;
}

export function parseAmount(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? NaN : val;
  const cleaned = String(val).replace(/[$€£₹,\s]/g, '').trim();
  if (cleaned === '') return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? NaN : num;
}

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
  const dateToleranceDays = options.dateToleranceDays ?? 3;
  const closingBankBalance = round2(Number(options.closingBankBalance) || 0);
  const closingLedgerBalance = round2(Number(options.closingLedgerBalance) || 0);

  const bank = bankTxns.map(t => ({ ...t, reconciled: false, matchedId: null }));
  const ledger = ledgerTxns.map(t => ({ ...t, reconciled: false, matchedId: null }));

  const matches = [];

  // Pass 1: Exact Reference + Exact Amount (Highest priority)
  bank.forEach(b => {
    if (b.reconciled || !b.reference) return;

    // Find all matching candidates in ledger
    const candidates = ledger.filter(
      l =>
        !l.reconciled &&
        l.isMoneyIn === b.isMoneyIn &&
        Math.abs(l.absAmount - b.absAmount) < 0.005 &&
        l.reference &&
        l.reference.toLowerCase() === b.reference.toLowerCase()
    );

    if (candidates.length === 1) {
      const candidate = candidates[0];
      b.reconciled = true;
      b.matchedId = candidate.id;
      b.matchConfidence = 100;
      b.matchReason = 'Exact Reference & Amount Match';

      candidate.reconciled = true;
      candidate.matchedId = b.id;
      candidate.matchConfidence = 100;
      candidate.matchReason = 'Exact Reference & Amount Match';

      matches.push({
        id: `match-${b.id}-${candidate.id}`,
        bank: b,
        ledger: candidate,
        type: 'exact_ref',
        confidence: 100,
        isAmbiguous: false,
        difference: 0,
      });
    } else if (candidates.length > 1) {
      // Multiple candidates with same reference and amount: Rank by date
      candidates.sort((c1, c2) => Math.abs(c1.dateObj - b.dateObj) - Math.abs(c2.dateObj - b.dateObj));
      const best = candidates[0];
      const secondBest = candidates[1];
      const isTie = Math.abs(best.dateObj - b.dateObj) === Math.abs(secondBest.dateObj - b.dateObj);

      b.reconciled = true;
      b.matchedId = best.id;
      b.matchConfidence = isTie ? 75 : 90;
      b.matchReason = isTie
        ? `Ambiguous: ${candidates.length} identical ledger entries with Ref "${b.reference}"`
        : 'Exact Reference & Nearest Date';
      b.isAmbiguous = isTie;
      b.competingCandidateCount = candidates.length;

      best.reconciled = true;
      best.matchedId = b.id;
      best.matchConfidence = b.matchConfidence;
      best.matchReason = b.matchReason;
      best.isAmbiguous = isTie;

      matches.push({
        id: `match-${b.id}-${best.id}`,
        bank: b,
        ledger: best,
        type: 'exact_ref',
        confidence: b.matchConfidence,
        isAmbiguous: isTie,
        candidateCount: candidates.length,
        difference: 0,
      });
    }
  });

  // Pass 2: Exact Amount + Scored Date & Similarity Ranking
  bank.forEach(b => {
    if (b.reconciled) return;

    // Find all un-reconciled ledger items with identical amount & direction
    const eligible = ledger.filter(
      l => !l.reconciled && l.isMoneyIn === b.isMoneyIn && Math.abs(l.absAmount - b.absAmount) < 0.005
    );

    if (eligible.length === 0) return;

    // Score each eligible candidate
    const scored = eligible.map(candidate => {
      const dayDiff = Math.abs(b.dateObj - candidate.dateObj) / (1000 * 60 * 60 * 24);
      const similarity = calculateTokenSimilarity(b.description, candidate.description);

      // Criteria: Must be within date tolerance OR have high description similarity
      const isDateValid = dayDiff <= dateToleranceDays;
      const isDescSimilar = similarity.score >= 0.5;

      let score = 0;
      if (isDateValid) {
        // Date score: 100 on same day, down to 60 at tolerance limit
        score += Math.max(0, 100 - (dayDiff / Math.max(1, dateToleranceDays)) * 40);
      }
      if (isDescSimilar) {
        score += similarity.score * 50;
      }

      return {
        candidate,
        dayDiff,
        similarity,
        score,
        isEligible: isDateValid || isDescSimilar,
      };
    }).filter(s => s.isEligible);

    if (scored.length === 0) return;

    // Rank candidates by highest score
    scored.sort((a, bScore) => bScore.score - a.score);

    const winner = scored[0];
    const runnerUp = scored.length > 1 ? scored[1] : null;

    // Detect ties or ambiguous duplicates
    const isAmbiguous = runnerUp && Math.abs(winner.score - runnerUp.score) < 5;

    const confidence = isAmbiguous
      ? 65
      : winner.dayDiff === 0
      ? 95
      : Math.max(70, Math.round(95 - winner.dayDiff * 4));

    b.reconciled = true;
    b.matchedId = winner.candidate.id;
    b.matchConfidence = confidence;
    b.isAmbiguous = isAmbiguous;
    b.competingCandidateCount = scored.length;
    b.matchReason = isAmbiguous
      ? `Ambiguous Match: ${scored.length} similar transactions (Day diff: ${Math.round(winner.dayDiff)})`
      : winner.dayDiff === 0
      ? 'Exact Amount & Same Day'
      : `Exact Amount (Within ${Math.round(winner.dayDiff)} days)`;

    winner.candidate.reconciled = true;
    winner.candidate.matchedId = b.id;
    winner.candidate.matchConfidence = confidence;
    winner.candidate.isAmbiguous = isAmbiguous;
    winner.candidate.matchReason = b.matchReason;

    matches.push({
      id: `match-${b.id}-${winner.candidate.id}`,
      bank: b,
      ledger: winner.candidate,
      type: winner.similarity.score >= 0.5 ? 'fuzzy_desc' : 'date_amount',
      confidence,
      isAmbiguous,
      candidateCount: scored.length,
      difference: 0,
    });
  });

  // Financial Figures & Standard Accounting Bank Reconciliation Statement
  const bankMatched = bank.filter(t => t.reconciled);
  const bankUnmatched = bank.filter(t => !t.reconciled);
  const ledgerMatched = ledger.filter(t => t.reconciled);
  const ledgerUnmatched = ledger.filter(t => !t.reconciled);

  const bankTotalTxnAmt = round2(bank.reduce((sum, t) => sum + t.amount, 0));
  const ledgerTotalTxnAmt = round2(ledger.reduce((sum, t) => sum + t.amount, 0));

  // Bank entries not recorded in Books
  const bankChargesOrDebits = round2(
    bankUnmatched.filter(t => !t.isMoneyIn).reduce((sum, t) => sum + t.absAmount, 0)
  );
  const bankDirectDeposits = round2(
    bankUnmatched.filter(t => t.isMoneyIn).reduce((sum, t) => sum + t.absAmount, 0)
  );

  // Book entries not cleared by Bank
  const unpresentedChecks = round2(
    ledgerUnmatched.filter(t => !t.isMoneyIn).reduce((sum, t) => sum + t.absAmount, 0)
  );
  const uncreditedDeposits = round2(
    ledgerUnmatched.filter(t => t.isMoneyIn).reduce((sum, t) => sum + t.absAmount, 0)
  );

  // Formal Bank Reconciliation Statement:
  // 1. Adjusted Bank Balance = Closing Bank Balance + Deposits in Transit - Outstanding Cheques
  const adjustedBankBalance = round2(closingBankBalance + uncreditedDeposits - unpresentedChecks);

  // 2. Adjusted Book Balance = Closing Book Balance + Direct Bank Deposits - Direct Bank Charges
  const adjustedBookBalance = round2(closingLedgerBalance + bankDirectDeposits - bankChargesOrDebits);

  // True reconciliation difference (Adjusted Bank Balance vs Adjusted Book Balance)
  const reconciliationDifference = round2(adjustedBankBalance - adjustedBookBalance);
  const isStatementReconciled = Math.abs(reconciliationDifference) < 0.01;

  const netTxnVariance = round2(bankTotalTxnAmt - ledgerTotalTxnAmt);
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
      matchedPairsCount: matches.length,
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

function round2(num) {
  return Math.round(num * 100) / 100;
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
