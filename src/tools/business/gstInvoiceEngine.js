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

export const GST_STATE_CODES = {
  'Jammu & Kashmir': '01', 'Himachal Pradesh': '02', Punjab: '03', Chandigarh: '04', Uttarakhand: '05', Haryana: '06', Delhi: '07', Rajasthan: '08', 'Uttar Pradesh': '09', Bihar: '10', Sikkim: '11', 'Arunachal Pradesh': '12', Nagaland: '13', Manipur: '14', Mizoram: '15', Tripura: '16', Meghalaya: '17', Assam: '18', 'West Bengal': '19', Jharkhand: '20', Odisha: '21', Chhattisgarh: '22', 'Madhya Pradesh': '23', Gujarat: '24', 'Daman & Diu': '25', 'Dadra & Nagar Haveli': '26', Maharashtra: '27', Karnataka: '29', Goa: '30', Lakshadweep: '31', Kerala: '32', 'Tamil Nadu': '33', Puducherry: '34', 'Andaman & Nicobar Islands': '35', Telangana: '36', 'Andhra Pradesh': '37', Ladakh: '38',
};
export function validateGstin(value) {
  const gstin = String(value ?? '').trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin) || !Object.values(GST_STATE_CODES).includes(gstin.slice(0, 2))) return 'Invalid GSTIN format/state code (local validation only).';
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = alphabet.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + product % 36;
  }
  return alphabet[(36 - sum % 36) % 36] === gstin[14] ? '' : 'GSTIN checksum mismatch (local validation only).';
}
export function resolveSupply(seller, buyer, meta) {
  const warnings = [];
  if (meta.placeOfSupply && buyer.state && meta.placeOfSupply !== buyer.state) warnings.push('Place of supply differs from buyer state. Confirm the explicit place of supply for this ordinary domestic supply.');
  return { isInterState: seller.state !== meta.placeOfSupply, warnings };
}
export function invoiceEditorTotals(items, isInterState) {
  const t = calcInvoiceTotals(items, isInterState);
  const grandTotal = Math.round(t.grandTotal);
  return { ...t, subtotal: t.grossTotal, totalDiscount: t.discountTotal, taxableAmount: t.taxableTotal,
    cgst: t.cgstTotal, sgst: t.sgstTotal, igst: t.igstTotal, rawTotal: t.grandTotal, grandTotal, roundOff: round2(grandTotal - t.grandTotal) };
}
export function validateInvoice({ seller = {}, buyer = {}, meta = {}, items = [] }) {
  const errors = [];
  for (const [label, value] of [['Seller name', seller.companyName], ['Seller address', seller.address], ['Seller GSTIN', seller.gstin], ['Buyer name', buyer.name], ['Buyer address', buyer.address], ['Invoice number', meta.invoiceNumber]]) if (!String(value ?? '').trim()) errors.push(`${label} is required.`);
  for (const [label, state] of [['Seller state', seller.state], ['Buyer state', buyer.state], ['Place of supply', meta.placeOfSupply]]) if (!GST_STATE_CODES[state]) errors.push(`${label} must be a supported domestic state.`);
  for (const [label, party] of [['Seller', seller], ['Buyer', buyer]]) {
    if (party.gstin) {
      const error = validateGstin(party.gstin);
      if (error) errors.push(`${label}: ${error}`);
      else if (party.gstin.slice(0, 2) !== GST_STATE_CODES[party.state]) errors.push(`${label} state conflicts with GSTIN state code. Correct one before export.`);
    }
  }
  if (!validInvoiceDate(meta.invoiceDate)) errors.push('A valid invoice date is required.');
  if (meta.dueDate && (!validInvoiceDate(meta.dueDate) || meta.dueDate < meta.invoiceDate)) errors.push('Due date must be valid and on or after the invoice date.');
  if (!items.length) errors.push('At least one line item is required.');
  items.forEach((item, i) => {
    if (!String(item.description ?? '').trim()) errors.push(`Row ${i + 1}: description is required.`);
    if (!String(item.hsn ?? '').trim()) errors.push(`Row ${i + 1}: HSN/SAC is required.`);
    for (const key of ['qty', 'rate', 'discount', 'gstRate']) {
      const value = item[key], number = Number(value);
      if (value == null || String(value).trim() === '' || !Number.isFinite(number) || number < 0 || (key === 'qty' && number <= 0) || (key === 'discount' && number > 100) || (key === 'gstRate' && number > 100) || number > 1e9) errors.push(`Row ${i + 1}: ${key} must be a finite supported value (quantity > 0, discount 0–100, rate/quantity at most 1 billion).`);
    }
  });
  const supply = resolveSupply(seller, buyer, meta);
  const totals = invoiceEditorTotals(items, supply.isInterState);
  if (!Number.isFinite(totals.grandTotal) || totals.grandTotal > 1e12) errors.push('Invoice total exceeds the supported finite amount limit of Rs. 1 trillion.');
  return { errors, warnings: supply.warnings, ...supply, totals };
}
function validInvoiceDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
