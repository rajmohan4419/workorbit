/**
 * GST Calculation & Currency Utilities
 * Precision financial engine conforming to Indian GST Act Section 170
 * and paise-level rounding rules.
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

export function round2(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

export function numToWords(n) {
  const num = Math.floor(Math.abs(n));
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numToWords(num % 100) : '');
  return convertIndianGroup(num);
}

function convertIndianGroup(n) {
  if (n === 0) return '';
  if (n < 1000) return numToWords(n);

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thou = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;

  let words = '';
  if (crore > 0) words += convertIndianGroup(crore) + ' Crore ';
  if (lakh > 0) words += numToWords(lakh) + ' Lakh ';
  if (thou > 0) words += numToWords(thou) + ' Thousand ';
  if (rem > 0) words += numToWords(rem);

  return words.trim();
}

/**
 * Converts an amount (Rupees & Paise) into Indian English words.
 * Supports:
 * - Negative amounts (Refunds / Credit Notes)
 * - Decimal paise (e.g. 50 Paise, 75 Paise)
 * - Amounts up to thousands of Crores
 */
export function amountToWords(amount) {
  const val = Number(amount || 0);
  if (isNaN(val)) return 'Zero Rupees Only';

  const isNegative = val < 0;
  const absVal = Math.abs(val);

  let rupees = Math.floor(absVal);
  const paise = Math.round((absVal - rupees) * 100);

  if (paise === 100) {
    rupees += 1;
  }

  const effectivePaise = paise === 100 ? 0 : paise;

  let words = '';
  if (rupees === 0 && effectivePaise === 0) {
    return 'Zero Rupees Only';
  }

  if (rupees > 0) {
    words += convertIndianGroup(rupees) + ' Rupees';
  }

  if (effectivePaise > 0) {
    const paiseText = numToWords(effectivePaise) + ' Paise';
    if (rupees > 0) {
      words += ' and ' + paiseText;
    } else {
      words += paiseText;
    }
  }

  words += ' Only';

  if (isNegative) {
    words = 'Minus ' + words;
  }

  return words.trim();
}

/**
 * Calculates a single invoice line item with strict paise-level rounding.
 * Capped discount between 0% and 100%.
 */
export function calcItem(item, isInterState) {
  const qty = Math.max(0, Number(item.qty) || 0);
  const rate = Number(item.rate) || 0;
  // Cap discount between 0 and 100%
  const discPercent = Math.min(100, Math.max(0, Number(item.discount) || 0));

  const gross = round2(qty * rate);
  const discAmt = round2(gross * (discPercent / 100));
  const taxable = round2(gross - discAmt);
  const gstRate = Math.max(0, Number(item.gstRate) || 0);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = round2(taxable * (gstRate / 100));
  } else {
    // CGST and SGST split equally (half rate each)
    cgst = round2(taxable * (gstRate / 200));
    sgst = round2(taxable * (gstRate / 200));
  }

  const total = round2(taxable + cgst + sgst + igst);

  return {
    gross,
    discPercent,
    discAmt,
    taxable,
    cgst,
    sgst,
    igst,
    totalTax: round2(cgst + sgst + igst),
    total,
  };
}

/**
 * Calculates aggregate invoice totals with paise precision across lines.
 */
export function calcInvoiceTotals(items, isInterState) {
  let grossTotal = 0;
  let discountTotal = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  items.forEach(item => {
    const c = calcItem(item, isInterState);
    grossTotal = round2(grossTotal + c.gross);
    discountTotal = round2(discountTotal + c.discAmt);
    taxableTotal = round2(taxableTotal + c.taxable);
    cgstTotal = round2(cgstTotal + c.cgst);
    sgstTotal = round2(sgstTotal + c.sgst);
    igstTotal = round2(igstTotal + c.igst);
  });

  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(taxableTotal + totalTax);

  return {
    grossTotal,
    discountTotal,
    taxableTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    totalTax,
    grandTotal,
    isInterState,
  };
}
