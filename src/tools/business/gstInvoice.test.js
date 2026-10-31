import { describe, it, expect } from 'vitest';
import { calcItem, calcInvoiceTotals, amountToWords, numToWords } from './gstInvoiceEngine';

describe('GST Invoice Calculations (gstInvoice.test.js)', () => {
  it('correctly calculates intra-state supply with CGST and SGST split equally', () => {
    const item = {
      qty: 2,
      rate: 1000,
      discount: 10, // 10% discount -> Gross: 2000, Discount: 200, Taxable: 1800
      gstRate: 18, // Intra-state: CGST 9% (162), SGST 9% (162)
    };

    const res = calcItem(item, false); // isInterState = false
    expect(res.gross).toBe(2000);
    expect(res.discAmt).toBe(200);
    expect(res.taxable).toBe(1800);
    expect(res.cgst).toBe(162);
    expect(res.sgst).toBe(162);
    expect(res.igst).toBe(0);
    expect(res.total).toBe(2124);
  });

  it('correctly calculates inter-state supply with IGST at full rate', () => {
    const item = {
      qty: 5,
      rate: 2000,
      discount: 0,
      gstRate: 12, // IGST 12% on 10,000 = 1200
    };

    const res = calcItem(item, true); // isInterState = true
    expect(res.gross).toBe(10000);
    expect(res.discAmt).toBe(0);
    expect(res.taxable).toBe(10000);
    expect(res.cgst).toBe(0);
    expect(res.sgst).toBe(0);
    expect(res.igst).toBe(1200);
    expect(res.total).toBe(11200);
  });

  it('handles zero percent (exempt) GST items without errors', () => {
    const item = {
      qty: 10,
      rate: 50,
      discount: 5,
      gstRate: 0,
    };

    const res = calcItem(item, false);
    expect(res.gross).toBe(500);
    expect(res.discAmt).toBe(25);
    expect(res.taxable).toBe(475);
    expect(res.cgst).toBe(0);
    expect(res.sgst).toBe(0);
    expect(res.igst).toBe(0);
    expect(res.total).toBe(475);
  });

  it('caps discounts greater than 100% at 100%', () => {
    const item = {
      qty: 1,
      rate: 1000,
      discount: 150, // >100% discount
      gstRate: 18,
    };

    const res = calcItem(item, false);
    expect(res.gross).toBe(1000);
    expect(res.discAmt).toBe(1000); // 100% capped
    expect(res.taxable).toBe(0);
    expect(res.total).toBe(0);
  });

  it('accurately maintains paise-level precision across multi-line invoices', () => {
    // Floating point challenge: 33.33 * 3 = 99.99
    const items = [
      { qty: 1, rate: 33.33, discount: 0, gstRate: 18 },
      { qty: 1, rate: 33.33, discount: 0, gstRate: 18 },
      { qty: 1, rate: 33.34, discount: 0, gstRate: 18 },
    ];

    const totals = calcInvoiceTotals(items, false);
    expect(totals.grossTotal).toBe(100);
    expect(totals.taxableTotal).toBe(100);
    expect(totals.totalTax).toBe(18); // 9 CGST + 9 SGST
    expect(totals.grandTotal).toBe(118);
  });

  it('accurately converts numbers to Indian English words', () => {
    expect(numToWords(0)).toBe('Zero');
    expect(numToWords(15)).toBe('Fifteen');
    expect(numToWords(48)).toBe('Forty Eight');
    expect(numToWords(750)).toBe('Seven Hundred Fifty');
  });

  it('formats amounts in words with Crores, Lakhs, Thousands, Rupees, and Decimal Paise', () => {
    expect(amountToWords(0)).toBe('Zero Rupees Only');
    expect(amountToWords(5400)).toBe('Five Thousand Four Hundred Rupees Only');
    expect(amountToWords(125000)).toBe('One Lakh Twenty Five Thousand Rupees Only');
    expect(amountToWords(25000000)).toBe('Two Crore Fifty Lakh Rupees Only');

    // Decimal Paise
    expect(amountToWords(1500.50)).toBe('One Thousand Five Hundred Rupees and Fifty Paise Only');
    expect(amountToWords(0.75)).toBe('Seventy Five Paise Only');

    // Negative amounts (refunds / credit notes)
    expect(amountToWords(-2500)).toBe('Minus Two Thousand Five Hundred Rupees Only');
    expect(amountToWords(-450.25)).toBe('Minus Four Hundred Fifty Rupees and Twenty Five Paise Only');

    // Large amounts exceeding 100 Crores
    expect(amountToWords(1500000000)).toBe('One Hundred Fifty Crore Rupees Only');
  });
});
