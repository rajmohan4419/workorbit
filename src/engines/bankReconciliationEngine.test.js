import { describe, it, expect } from 'vitest';
import {
  normalizeTransaction,
  reconcileTransactions,
  SAMPLE_RECONCILIATION_DATA,
} from './bankReconciliationEngine.js';

describe('Bank Reconciliation Engine (bankReconciliationEngine.js)', () => {
  it('normalizes bank deposits and withdrawals with correct sign conventions', () => {
    const depositRow = { Date: '2025-03-01', Description: 'Customer Wire', Deposit: 5000, Withdrawal: '' };
    const withdrawalRow = { Date: '2025-03-02', Description: 'Vendor Wire', Deposit: '', Withdrawal: 1500 };

    const mapping = { date: 'Date', description: 'Description', credit: 'Deposit', debit: 'Withdrawal' };

    const bankIn = normalizeTransaction(depositRow, mapping, 'bank');
    expect(bankIn.amount).toBe(5000);
    expect(bankIn.isMoneyIn).toBe(true);

    const bankOut = normalizeTransaction(withdrawalRow, mapping, 'bank');
    expect(bankOut.amount).toBe(-1500);
    expect(bankOut.isMoneyIn).toBe(false);
  });

  it('normalizes ledger cashbook receipts and payments with correct accounting convention', () => {
    // In Cash Book / Ledger: Debit = Receipt (+), Credit = Payment (-)
    const receiptRow = { Date: '2025-03-01', Description: 'Cash Receipt', Receipt: 5000, Payment: '' };
    const paymentRow = { Date: '2025-03-02', Description: 'Cash Payment', Receipt: '', Payment: 1500 };

    const mapping = { date: 'Date', description: 'Description', debit: 'Receipt', credit: 'Payment' };

    const ledgerIn = normalizeTransaction(receiptRow, mapping, 'ledger');
    expect(ledgerIn.amount).toBe(5000);
    expect(ledgerIn.isMoneyIn).toBe(true);

    const ledgerOut = normalizeTransaction(paymentRow, mapping, 'ledger');
    expect(ledgerOut.amount).toBe(-1500);
    expect(ledgerOut.isMoneyIn).toBe(false);
  });

  it('matches transactions with exact reference and amount', () => {
    const bankTxns = [
      normalizeTransaction(
        { Date: '2025-03-01', Description: 'Client Wire', Reference: 'TXN-101', Deposit: 10000, Withdrawal: '' },
        { date: 'Date', description: 'Description', reference: 'Reference', credit: 'Deposit', debit: 'Withdrawal' },
        'bank'
      ),
    ];
    const ledgerTxns = [
      normalizeTransaction(
        { Date: '2025-03-02', Description: 'Client Wire Inv 55', Reference: 'TXN-101', Receipt: 10000, Payment: '' },
        { date: 'Date', description: 'Description', reference: 'Reference', debit: 'Receipt', credit: 'Payment' },
        'ledger'
      ),
    ];

    const result = reconcileTransactions(bankTxns, ledgerTxns, { dateToleranceDays: 3 });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].type).toBe('exact_ref');
    expect(result.matches[0].confidence).toBe(100);
    expect(result.bankUnmatched.length).toBe(0);
    expect(result.ledgerUnmatched.length).toBe(0);
  });

  it('matches transactions within date tolerance window when amounts are equal', () => {
    const bankTxns = [
      normalizeTransaction(
        { Date: '2025-03-05', Description: 'Supplier wire payment', Reference: '', Deposit: '', Withdrawal: 2500 },
        { date: 'Date', description: 'Description', reference: 'Reference', credit: 'Deposit', debit: 'Withdrawal' },
        'bank'
      ),
    ];
    const ledgerTxns = [
      normalizeTransaction(
        { Date: '2025-03-03', Description: 'Vendor Bill 202', Reference: '', Receipt: '', Payment: 2500 },
        { date: 'Date', description: 'Description', reference: 'Reference', debit: 'Receipt', credit: 'Payment' },
        'ledger'
      ),
    ];

    const result = reconcileTransactions(bankTxns, ledgerTxns, { dateToleranceDays: 5 });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].type).toBe('date_amount');
    expect(result.matches[0].confidence).toBeGreaterThanOrEqual(70);
  });

  it('correctly calculates sample reconciliation with unpresented cheques and direct debits', () => {
    const bankMapping = { date: 'Date', description: 'Description', reference: 'Reference', credit: 'Deposit', debit: 'Withdrawal' };
    const ledgerMapping = { date: 'Date', description: 'Description', reference: 'Reference', debit: 'Receipt', credit: 'Payment' };

    const bankTxns = SAMPLE_RECONCILIATION_DATA.bankRows.map(r => normalizeTransaction(r, bankMapping, 'bank'));
    const ledgerTxns = SAMPLE_RECONCILIATION_DATA.ledgerRows.map(r => normalizeTransaction(r, ledgerMapping, 'ledger'));

    const result = reconcileTransactions(bankTxns, ledgerTxns, { dateToleranceDays: 3 });

    // 5 matched pairs, 2 unmatched in bank (bank charges, interest), 2 unmatched in ledger (unpresented check 6200, deposit in transit 32000)
    expect(result.matches.length).toBe(5);
    expect(result.bankUnmatched.length).toBe(2);
    expect(result.ledgerUnmatched.length).toBe(2);
    expect(result.summary.unpresentedChecks).toBe(6200);
    expect(result.summary.uncreditedDeposits).toBe(32000);
    expect(result.summary.bankChargesOrDebits).toBe(1180);
    expect(result.summary.bankDirectDeposits).toBe(3420);
  });
});
