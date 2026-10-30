/**
 * GST Calculation & Currency Utilities
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

export function numToWords(n) {
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
  return '';
}

export function amountToWords(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n === 0) return 'Zero Rupees Only';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thou = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;

  let words = '';
  if (crore) words += numToWords(crore) + ' Crore ';
  if (lakh) words += numToWords(lakh) + ' Lakh ';
  if (thou) words += numToWords(thou) + ' Thousand ';
  if (rem) words += numToWords(rem);

  return words.trim() + ' Rupees Only';
}

export function calcItem(item, isInterState) {
  const qty = Number(item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const disc = Number(item.discount) || 0;
  const gross = qty * rate;
  const discAmt = gross * (disc / 100);
  const taxable = gross - discAmt;
  const gstRate = Number(item.gstRate) || 0;

  let cgst = 0, sgst = 0, igst = 0;
  if (isInterState) {
    igst = taxable * (gstRate / 100);
  } else {
    cgst = taxable * (gstRate / 100 / 2);
    sgst = taxable * (gstRate / 100 / 2);
  }
  const total = taxable + cgst + sgst + igst;
  return { gross, discAmt, taxable, cgst, sgst, igst, total };
}
