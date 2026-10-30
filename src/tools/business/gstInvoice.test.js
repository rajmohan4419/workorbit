import { describe, it, expect } from 'vitest';
import { calcItem, amountToWords, numToWords } from './gstInvoiceEngine';

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

  it('accurately converts numbers to Indian English words', () => {
    expect(numToWords(0)).toBe('Zero');
    expect(numToWords(15)).toBe('Fifteen');
    expect(numToWords(48)).toBe('Forty Eight');
    expect(numToWords(750)).toBe('Seven Hundred Fifty');
  });

  it('formats amounts in words with Crores, Lakhs, Thousands and Rupees', () => {
    expect(amountToWords(0)).toBe('Zero Rupees Only');
    expect(amountToWords(5400)).toBe('Five Thousand Four Hundred Rupees Only');
    expect(amountToWords(125000)).toBe('One Lakh Twenty Five Thousand Rupees Only');
    expect(amountToWords(25000000)).toBe('Two Crore Fifty Lakh Rupees Only');
  });
});
