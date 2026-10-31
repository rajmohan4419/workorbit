import { describe, it, expect } from 'vitest';
import {
  normalizeTransaction,
  reconcileTransactions,
  calculateTokenSimilarity,
  SAMPLE_RECONCILIATION_DATA,
} from './bankReconciliationEngine.js';

describe('Bank Reconciliation Engine (bankReconciliationEngine.js)', () => {
  it('normalizes bank deposits and withdrawals with correct sign conventions', () => {
    const depositRow = { Date: '2025-03-01', Description: 'Customer Wire', Deposit: 5000, Withdrawal: '' };
    const withdrawalRow = { Date: '2025-03-02', Description: 'Vendor Wire', Deposit: '', Withdrawal: 1500 };

    const mapping = { date: 'Date', description: 'Description', credit: 'Deposit', debit: 'Withdrawal' };

    const { transaction: bankIn, error: err1 } = normalizeTransaction(depositRow, mapping, 'bank', 0);
    expect(err1).toBeNull();
    expect(bankIn.amount).toBe(5000);
    expect(bankIn.isMoneyIn).toBe(true);

    const { transaction: bankOut, error: err2 } = normalizeTransaction(withdrawalRow, mapping, 'bank', 1);
    expect(err2).toBeNull();
    expect(bankOut.amount).toBe(-1500);
    expect(bankOut.isMoneyIn).toBe(false);
  });

  it('normalizes ledger cashbook receipts and payments with correct accounting convention', () => {
    // In Cash Book / Ledger: Debit = Receipt (+), Credit = Payment (-)
    const receiptRow = { Date: '2025-03-01', Description: 'Cash Receipt', Receipt: 5000, Payment: '' };
    const paymentRow = { Date: '2025-03-02', Description: 'Cash Payment', Receipt: '', Payment: 1500 };

    const mapping = { date: 'Date', description: 'Description', debit: 'Receipt', credit: 'Payment' };

    const { transaction: ledgerIn, error: err1 } = normalizeTransaction(receiptRow, mapping, 'ledger', 0);
    expect(err1).toBeNull();
    expect(ledgerIn.amount).toBe(5000);
    expect(ledgerIn.isMoneyIn).toBe(true);

    const { transaction: ledgerOut, error: err2 } = normalizeTransaction(paymentRow, mapping, 'ledger', 1);
    expect(err2).toBeNull();
    expect(ledgerOut.amount).toBe(-1500);
    expect(ledgerOut.isMoneyIn).toBe(false);
  });

  it('rejects invalid or missing dates with row-level error without falling back to today', () => {
    const mapping = { date: 'Date', description: 'Description', credit: 'Deposit', debit: 'Withdrawal' };

    const invalidDateRow = { Date: 'not-a-date', Description: 'Invalid Date', Deposit: 1000, Withdrawal: '' };
    const res1 = normalizeTransaction(invalidDateRow, mapping, 'bank', 4);
    expect(res1.transaction).toBeNull();
    expect(res1.error).toContain('Row 5: Invalid date format');

    const emptyDateRow = { Date: '', Description: 'No Date', Deposit: 1000, Withdrawal: '' };
    const res2 = normalizeTransaction(emptyDateRow, mapping, 'bank', 9);
    expect(res2.transaction).toBeNull();
    expect(res2.error).toContain('Row 10: Date is missing');
  });

  it('rejects invalid or non-numeric amounts before matching', () => {
    const mapping = { date: 'Date', description: 'Description', credit: 'Deposit', debit: 'Withdrawal' };

    const badAmountRow = { Date: '2025-03-01', Description: 'Bad Amount', Deposit: 'NaN-xyz', Withdrawal: '' };
    const res1 = normalizeTransaction(badAmountRow, mapping, 'bank', 2);
    expect(res1.transaction).toBeNull();
    expect(res1.error).toContain('Row 3: Amount contains invalid non-numeric characters');

    const zeroAmountRow = { Date: '2025-03-01', Description: 'Zero Amount', Deposit: 0, Withdrawal: 0 };
    const res2 = normalizeTransaction(zeroAmountRow, mapping, 'bank', 3);
    expect(res2.transaction).toBeNull();
    expect(res2.error).toContain('Row 4: Transaction amount cannot be zero');
  });

  it('parses Excel serial dates and DD/MM/YYYY formats correctly', () => {
    const mapping = { date: 'Date', description: 'Description', credit: 'Deposit', debit: 'Withdrawal' };

    // Excel serial 45717 corresponds to 2025-03-01
    const serialRow = { Date: 45717, Description: 'Excel Serial Date', Deposit: 2000, Withdrawal: '' };
    const resSerial = normalizeTransaction(serialRow, mapping, 'bank', 0);
    expect(resSerial.transaction).not.toBeNull();
    expect(resSerial.transaction.date).toBe('2025-03-01');

    // DD/MM/YYYY format
    const dmyRow = { Date: '15/03/2025', Description: 'DMY Date', Deposit: 3000, Withdrawal: '' };
    const resDmy = normalizeTransaction(dmyRow, mapping, 'bank', 1);
    expect(resDmy.transaction).not.toBeNull();
    expect(resDmy.transaction.date).toBe('2025-03-15');
  });

  it('generates deterministic transaction IDs across recalculations', () => {
    const mapping = { date: 'Date', description: 'Description', reference: 'Ref', credit: 'Deposit', debit: 'Withdrawal' };
    const row = { Date: '2025-03-01', Description: 'Test', Ref: 'REF123', Deposit: 5000, Withdrawal: '' };

    const run1 = normalizeTransaction(row, mapping, 'bank', 0);
    const run2 = normalizeTransaction(row, mapping, 'bank', 0);
    expect(run1.transaction.id).toBe(run2.transaction.id);
    expect(run1.transaction.id).toContain('bank-row1-');
  });

  it('matches transactions with exact reference and amount', () => {
    const { transaction: bankTxn } = normalizeTransaction(
      { Date: '2025-03-01', Description: 'Client Wire', Reference: 'TXN-101', Deposit: 10000, Withdrawal: '' },
      { date: 'Date', description: 'Description', reference: 'Reference', credit: 'Deposit', debit: 'Withdrawal' },
      'bank',
      0
    );
    const { transaction: ledgerTxn } = normalizeTransaction(
      { Date: '2025-03-02', Description: 'Client Wire Inv 55', Reference: 'TXN-101', Receipt: 10000, Payment: '' },
      { date: 'Date', description: 'Description', reference: 'Reference', debit: 'Receipt', credit: 'Payment' },
      'ledger',
      0
    );

    const result = reconcileTransactions([bankTxn], [ledgerTxn], { dateToleranceDays: 3 });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].type).toBe('exact_ref');
    expect(result.matches[0].confidence).toBe(100);
    expect(result.bankUnmatched.length).toBe(0);
    expect(result.ledgerUnmatched.length).toBe(0);
  });

  it('requires multi-token narration similarity and ignores generic stop words', () => {
    // Both contain "payment" and "ltd" (stop words) + "Acme" (only 1 real word) -> insufficient similarity
    const sim1 = calculateTokenSimilarity('Payment to Acme Ltd', 'Wire Payment from Acme Ltd');
    expect(sim1.score).toBe(0); // Only "acme" is significant, single word not enough

    // Both contain "Acme" AND "Consulting" -> 2 significant words
    const sim2 = calculateTokenSimilarity('Acme Consulting Retainer Payment', 'Acme Consulting Invoice 202');
    expect(sim2.score).toBeGreaterThan(0);
    expect(sim2.sharedWords).toContain('acme');
    expect(sim2.sharedWords).toContain('consulting');
  });

  it('ranks candidates and flags ambiguous ties when multiple ledger candidates match', () => {
    const bankTxn = normalizeTransaction(
      { Date: '2025-03-10', Description: 'Monthly Service Fee', Reference: '', Deposit: '', Withdrawal: 5000 },
      { date: 'Date', description: 'Description', reference: 'Reference', credit: 'Deposit', debit: 'Withdrawal' },
      'bank',
      0
    ).transaction;

    // Two identical ledger candidates with identical amount and date
    const ledger1 = normalizeTransaction(
      { Date: '2025-03-10', Description: 'Service Fee Vendor A', Reference: '', Receipt: '', Payment: 5000 },
      { date: 'Date', description: 'Description', reference: 'Reference', debit: 'Receipt', credit: 'Payment' },
      'ledger',
      0
    ).transaction;

    const ledger2 = normalizeTransaction(
      { Date: '2025-03-10', Description: 'Service Fee Vendor B', Reference: '', Receipt: '', Payment: 5000 },
      { date: 'Date', description: 'Description', reference: 'Reference', debit: 'Receipt', credit: 'Payment' },
      'ledger',
      1
    ).transaction;

    const result = reconcileTransactions([bankTxn], [ledger1, ledger2], { dateToleranceDays: 2 });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].isAmbiguous).toBe(true);
    expect(result.matches[0].candidateCount).toBe(2);
    expect(result.summary.ambiguousMatchesCount).toBe(1);
  });

  it('correctly calculates formal Bank Reconciliation Statement and verifies balanced status', () => {
    const bankMapping = { date: 'Date', description: 'Description', reference: 'Reference', credit: 'Deposit', debit: 'Withdrawal' };
    const ledgerMapping = { date: 'Date', description: 'Description', reference: 'Reference', debit: 'Receipt', credit: 'Payment' };

    const bankTxns = SAMPLE_RECONCILIATION_DATA.bankRows.map((r, i) => normalizeTransaction(r, bankMapping, 'bank', i).transaction);
    const ledgerTxns = SAMPLE_RECONCILIATION_DATA.ledgerRows.map((r, i) => normalizeTransaction(r, ledgerMapping, 'ledger', i).transaction);

    const result = reconcileTransactions(bankTxns, ledgerTxns, {
      dateToleranceDays: 3,
      closingBankBalance: SAMPLE_RECONCILIATION_DATA.closingBankBalance, // 244,990
      closingLedgerBalance: SAMPLE_RECONCILIATION_DATA.closingLedgerBalance, // 268,550
    });

    // 5 matched pairs, 2 unmatched bank entries (charges 1180, interest 3420), 2 unmatched ledger entries (chq 6200, transit 32000)
    expect(result.matches.length).toBe(5);
    expect(result.bankUnmatched.length).toBe(2);
    expect(result.ledgerUnmatched.length).toBe(2);
    expect(result.summary.unpresentedChecks).toBe(6200);
    expect(result.summary.uncreditedDeposits).toBe(32000);
    expect(result.summary.bankChargesOrDebits).toBe(1180);
    expect(result.summary.bankDirectDeposits).toBe(3420);

    // Adjusted Bank Balance = 244,990 + 32,000 (deposit in transit) - 6,200 (unpresented chq) = 270,790
    expect(result.summary.adjustedBankBalance).toBe(270790);

    // Adjusted Book Balance = 268,550 + 3,420 (direct deposit/interest) - 1,180 (bank charges) = 270,790
    expect(result.summary.adjustedBookBalance).toBe(270790);

    // Difference must be exactly 0
    expect(result.summary.reconciliationDifference).toBe(0);
    expect(result.summary.isStatementReconciled).toBe(true);
  });
});
