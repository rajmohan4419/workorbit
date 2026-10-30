/**
 * Bank Reconciliation Engine
 * High-precision reconciliation between Bank Statements and Accounting Ledgers.
 */

/**
 * Standardize transaction records for reconciliation.
 * Normalizes sign convention:
 * - Deposits/Receipts (Money In) -> positive amount
 * - Withdrawals/Payments (Money Out) -> negative amount
 */
export function normalizeTransaction(row, mapping, source = 'bank') {
  const dateStr = String(row[mapping.date] || '').trim();
  const dateObj = new Date(dateStr);
  const validDate = !isNaN(dateObj.getTime()) ? dateObj : new Date();

  const ref = String(row[mapping.reference] || '').trim();
  const desc = String(row[mapping.description] || '').trim();

  let amount = 0;

  // Case 1: Separate Debit & Credit columns
  if (mapping.debit && mapping.credit && (row[mapping.debit] !== undefined || row[mapping.credit] !== undefined)) {
    const debit = parseAmount(row[mapping.debit]);
    const credit = parseAmount(row[mapping.credit]);

    if (source === 'bank') {
      // In a bank statement:
      // Credit = Deposit (Money In = positive)
      // Debit = Withdrawal (Money Out = negative)
      amount = credit > 0 ? credit : -debit;
    } else {
      // In a company Cash Book / Ledger:
      // Debit = Receipt (Money In = positive)
      // Credit = Payment (Money Out = negative)
      amount = debit > 0 ? debit : -credit;
    }
  } else if (mapping.amount) {
    // Case 2: Single Amount column with optional Type indicator
    const rawAmt = parseAmount(row[mapping.amount]);
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
  }

  return {
    id: `${source}-${Math.random().toString(36).substring(2, 9)}`,
    source,
    raw: row,
    date: validDate.toISOString().split('T')[0],
    dateObj: validDate,
    description: desc,
    reference: ref,
    amount: Math.round(amount * 100) / 100, // Two decimals precision
    absAmount: Math.round(Math.abs(amount) * 100) / 100,
    isMoneyIn: amount >= 0,
    reconciled: false,
    matchedId: null,
    matchConfidence: 0,
    matchReason: '',
  };
}

export function parseAmount(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[$€£₹,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Reconcile normalized bank transactions against normalized ledger transactions.
 * @param {Array} bankTxns
 * @param {Array} ledgerTxns
 * @param {Object} options { dateToleranceDays: number, exactRefOnly: boolean }
 */
export function reconcileTransactions(bankTxns, ledgerTxns, options = {}) {
  const dateToleranceDays = options.dateToleranceDays ?? 5;

  const bank = bankTxns.map(t => ({ ...t, reconciled: false, matchedId: null }));
  const ledger = ledgerTxns.map(t => ({ ...t, reconciled: false, matchedId: null }));

  const matches = [];

  // Pass 1: Exact Amount + Exact Reference Match (Strongest match)
  bank.forEach(b => {
    if (b.reconciled || !b.reference) return;

    const candidate = ledger.find(
      l =>
        !l.reconciled &&
        l.isMoneyIn === b.isMoneyIn &&
        Math.abs(l.absAmount - b.absAmount) < 0.01 &&
        l.reference &&
        l.reference.toLowerCase() === b.reference.toLowerCase()
    );

    if (candidate) {
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
        difference: 0,
      });
    }
  });

  // Pass 2: Exact Amount + Close Date Match (within dateToleranceDays)
  bank.forEach(b => {
    if (b.reconciled) return;

    let bestCandidate = null;
    let minDayDiff = Infinity;

    ledger.forEach(l => {
      if (l.reconciled || l.isMoneyIn !== b.isMoneyIn) return;
      if (Math.abs(l.absAmount - b.absAmount) >= 0.01) return;

      const dayDiff = Math.abs(b.dateObj - l.dateObj) / (1000 * 60 * 60 * 24);
      if (dayDiff <= dateToleranceDays && dayDiff < minDayDiff) {
        minDayDiff = dayDiff;
        bestCandidate = l;
      }
    });

    if (bestCandidate) {
      const confidence = minDayDiff === 0 ? 95 : Math.max(70, 95 - Math.round(minDayDiff * 4));
      b.reconciled = true;
      b.matchedId = bestCandidate.id;
      b.matchConfidence = confidence;
      b.matchReason = `Exact Amount (${minDayDiff === 0 ? 'Same day' : `Within ${Math.round(minDayDiff)} days`})`;

      bestCandidate.reconciled = true;
      bestCandidate.matchedId = b.id;
      bestCandidate.matchConfidence = confidence;
      bestCandidate.matchReason = b.matchReason;

      matches.push({
        id: `match-${b.id}-${bestCandidate.id}`,
        bank: b,
        ledger: bestCandidate,
        type: 'date_amount',
        confidence,
        difference: 0,
      });
    }
  });

  // Pass 3: Fuzzy Description Match if amounts are identical
  bank.forEach(b => {
    if (b.reconciled) return;

    const bWords = cleanWords(b.description);
    if (bWords.length === 0) return;

    let bestCandidate = null;
    let maxOverlap = 0;

    ledger.forEach(l => {
      if (l.reconciled || l.isMoneyIn !== b.isMoneyIn) return;
      if (Math.abs(l.absAmount - b.absAmount) >= 0.01) return;

      const lWords = cleanWords(l.description);
      const overlap = bWords.filter(w => lWords.includes(w)).length;
      if (overlap > maxOverlap && overlap >= 1) {
        maxOverlap = overlap;
        bestCandidate = l;
      }
    });

    if (bestCandidate && maxOverlap >= 1) {
      b.reconciled = true;
      b.matchedId = bestCandidate.id;
      b.matchConfidence = 80;
      b.matchReason = `Amount & Keyword Match (${maxOverlap} shared words)`;

      bestCandidate.reconciled = true;
      bestCandidate.matchedId = b.id;
      bestCandidate.matchConfidence = 80;
      bestCandidate.matchReason = b.matchReason;

      matches.push({
        id: `match-${b.id}-${bestCandidate.id}`,
        bank: b,
        ledger: bestCandidate,
        type: 'fuzzy_desc',
        confidence: 80,
        difference: 0,
      });
    }
  });

  // Calculate reconciliation financial figures
  const bankMatched = bank.filter(t => t.reconciled);
  const bankUnmatched = bank.filter(t => !t.reconciled);
  const ledgerMatched = ledger.filter(t => t.reconciled);
  const ledgerUnmatched = ledger.filter(t => !t.reconciled);

  const bankTotal = round2(bank.reduce((sum, t) => sum + t.amount, 0));
  const ledgerTotal = round2(ledger.reduce((sum, t) => sum + t.amount, 0));

  // Items in bank not in ledger:
  const bankChargesOrDebits = round2(
    bankUnmatched.filter(t => !t.isMoneyIn).reduce((sum, t) => sum + t.absAmount, 0)
  );
  const bankDirectDeposits = round2(
    bankUnmatched.filter(t => t.isMoneyIn).reduce((sum, t) => sum + t.absAmount, 0)
  );

  // Items in ledger not in bank:
  const unpresentedChecks = round2(
    ledgerUnmatched.filter(t => !t.isMoneyIn).reduce((sum, t) => sum + t.absAmount, 0)
  );
  const uncreditedDeposits = round2(
    ledgerUnmatched.filter(t => t.isMoneyIn).reduce((sum, t) => sum + t.absAmount, 0)
  );

  const netVariance = round2(bankTotal - ledgerTotal);
  const matchRate = (bank.length + ledger.length) > 0
    ? Math.round(((bankMatched.length + ledgerMatched.length) / (bank.length + ledger.length)) * 100)
    : 0;

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
      matchRatePercent: matchRate,
      bankTotal,
      ledgerTotal,
      bankChargesOrDebits,
      bankDirectDeposits,
      unpresentedChecks,
      uncreditedDeposits,
      netVariance,
      isBalanced: Math.abs(netVariance) < 0.01,
    },
  };
}

function cleanWords(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'pvt', 'ltd', 'inc', 'corp', 'txn', 'transfer', 'payment'].includes(w));
}

function round2(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Built-in Sample Datasets for 1-click Demo
 */
export const SAMPLE_RECONCILIATION_DATA = {
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
