/** Local uploaded GSTR-2B / purchase register matching. No eligibility determination. */

import { formatINR } from '../../lib/toolFormat.js';

export function normalizeGstin(gstin) {
  return String(gstin || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeInvoiceNumber(inv) {
  return String(inv || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export { strictAmount as parseAmount, strictDate as parseDate } from '../../engines/financeValidation.js';
import { strictAmount as parseAmount, strictDate as parseDate } from '../../engines/financeValidation.js';

/**
 * Intelligent column mapping for diverse CSV/XLSX headers.
 * Detects official GST Portal, Tally, Busy, and standard accounting headers.
 */
export function detectColumnMapping(headers = []) {
  const norm = headers.map(h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  const findBest = priorityGroups => {
    for (const group of priorityGroups) {
      const idx = headers.findIndex((_, i) => {
        const n = norm[i];
        if (typeof group === 'function') {
          return group(n, headers[i]);
        }
        return group.some(pattern => n.includes(pattern));
      });
      if (idx !== -1) return headers[idx];
    }
    return null;
  };

  const gstin = findBest([
    ['suppliergstin', 'gstinofsupplier', 'partygstin', 'vendorgstin', 'ctin'],
    ['gstin', 'vendorpan'],
  ]);

  const invoiceNumber = findBest([
    ['invoicenumber', 'invoiceno', 'invno', 'billno', 'voucherno', 'vchno', 'docno', 'documentno', 'documentnumber', 'invnum', 'invoicenum'],
    n => (n === 'invoice' || n === 'bill' || n === 'inv') && !n.includes('date') && !n.includes('val') && !n.includes('amt'),
  ]);

  const invoiceDate = findBest([
    ['invoicedate', 'invdate', 'billdate', 'docdate', 'vchdate', 'voucherdate'],
    ['date'],
  ]);

  const taxableValue = findBest([
    ['taxablevalue', 'taxableamount', 'taxableval', 'taxableamt', 'assessablevalue', 'assessableamount', 'assessableval', 'assessableamt', 'taxable'],
    ['baseamount', 'netamount'],
    n => (n.includes('invvalue') || n.includes('amount') || n.includes('value')) && !n.includes('tax') && !n.includes('cgst') && !n.includes('igst') && !n.includes('sgst') && !n.includes('total'),
  ]);

  const igst = findBest([
    ['integratedtax', 'igstamount', 'integratedtaxamount', 'igst'],
  ]);

  const cgst = findBest([
    ['centraltax', 'cgstamount', 'centraltaxamount', 'cgst'],
  ]);

  const sgst = findBest([
    ['stateuttax', 'statetax', 'sgstamount', 'utgstamount', 'statetaxamount', 'sgst', 'utgst', 'stateut'],
  ]);

  return {
    gstin,
    invoiceNumber,
    invoiceDate,
    taxableValue,
    igst,
    cgst,
    sgst,
    cess: findBest([['cess']]),
  };
}

export function generateUnmatchableKey(source = 'record', index = 0) {
  return `__unmatchable_${source}_${index}_row__`;
}

/**
 * Normalize an invoice row object.
 */
export function normalizeInvoiceRecord(row, mapping = {}, source = 'gstr', index = 0) {
  const r = (row && typeof row === 'object') ? row : {};

  const rawGstin = (mapping.gstin && r[mapping.gstin] !== undefined)
    ? r[mapping.gstin]
    : (r.gstin ?? r.GSTIN ?? r['Supplier GSTIN'] ?? r['GSTIN of supplier'] ?? r['Party GSTIN'] ?? '');

  const rawInvoice = (mapping.invoiceNumber && r[mapping.invoiceNumber] !== undefined)
    ? r[mapping.invoiceNumber]
    : (r.invoiceNumber ?? r['Invoice Number'] ?? r['Invoice number'] ?? r.invNumber ?? r['Invoice No'] ?? r['Invoice No.'] ?? r['Voucher No.'] ?? r['Vch No.'] ?? '');

  const rawDate = (mapping.invoiceDate && r[mapping.invoiceDate] !== undefined)
    ? r[mapping.invoiceDate]
    : (r.invoiceDate ?? r['Invoice Date'] ?? r['Invoice date'] ?? r.date ?? r.Date ?? r['Inv Date'] ?? '');

  const rawTaxable = (mapping.taxableValue && r[mapping.taxableValue] !== undefined)
    ? r[mapping.taxableValue]
    : (r.taxableValue ?? r['Taxable Value'] ?? r['Taxable Value (₹)'] ?? r.taxableAmount ?? r['Taxable Amount'] ?? r['Assessable Value'] ?? null);

  const rawIgst = (mapping.igst && r[mapping.igst] !== undefined)
    ? r[mapping.igst]
    : (r.igst ?? r.IGST ?? r['Integrated Tax'] ?? r['Integrated Tax (₹)'] ?? r['IGST Amount'] ?? null);

  const rawCgst = (mapping.cgst && r[mapping.cgst] !== undefined)
    ? r[mapping.cgst]
    : (r.cgst ?? r.CGST ?? r['Central Tax'] ?? r['Central Tax (₹)'] ?? r['CGST Amount'] ?? null);

  const rawSgst = (mapping.sgst && r[mapping.sgst] !== undefined)
    ? r[mapping.sgst]
    : (r.sgst ?? r.SGST ?? r['State/UT Tax'] ?? r['State/UT Tax (₹)'] ?? r['State Tax'] ?? r['SGST Amount'] ?? null);

  const taxableValue = parseAmount(rawTaxable);
  const igst = parseAmount(rawIgst);
  const cgst = parseAmount(rawCgst);
  const sgst = parseAmount(rawSgst);
  const rawCess = mapping.cess ? r[mapping.cess] : (r.cess ?? r.Cess ?? r['Cess (₹)'] ?? null);
  const cess = parseAmount(rawCess);
  const taxPresent = Object.fromEntries(Object.entries({ igst: rawIgst, cgst: rawCgst, sgst: rawSgst, cess: rawCess }).map(([k, v]) => [k, v != null && String(v).trim() !== '']));
  const errors = [];
  if (!Number.isFinite(taxableValue)) errors.push('Taxable value must be a finite amount.');
  for (const [key, value] of Object.entries({ igst, cgst, sgst, cess })) if (taxPresent[key] && !Number.isFinite(value)) errors.push(`${key.toUpperCase()} must be a finite amount.`);
  if (rawDate != null && String(rawDate).trim() !== '' && !parseDate(rawDate)) errors.push('Invalid calendar date; use YYYY-MM-DD or DD/MM/YYYY.');
  const totalTax = [igst, cgst, sgst, cess].reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  if ([taxableValue, igst, cgst, sgst, cess].some(v => Number.isFinite(v) && Math.abs(v) > 1e12)) errors.push('Amount exceeds supported per-field limit of 1 trillion. Split or correct this record.');
  const normGstin = normalizeGstin(rawGstin);
  const normInvoice = normalizeInvoiceNumber(rawInvoice);
  const isUnmatchable = !normGstin || !normInvoice;
  const matchKey = isUnmatchable
    ? generateUnmatchableKey(source, index)
    : `${normGstin}::${normInvoice}`;

  return {
    source,
    rowNumber: r.__sourceRow ?? index + 1,
    sourceLabel: r.__sourceLabel ?? source,
    errors,
    taxPresent,
    cess: taxPresent.cess ? cess : null,
    gstin: String(rawGstin || '').trim(),
    normalizedGstin: normGstin,
    invoiceNumber: String(rawInvoice || '').trim(),
    normalizedInvoiceNumber: normInvoice,
    invoiceDate: parseDate(rawDate),
    taxableValue,
    igst: taxPresent.igst ? igst : null,
    cgst: taxPresent.cgst ? cgst : null,
    sgst: taxPresent.sgst ? sgst : null,
    totalTax,
    totalInvoiceValue: taxableValue + totalTax,
    isUnmatchable,
    matchKey,
    raw: row,
  };
}

/**
 * Core Reconciliation Logic
 * Matches GSTR-2B invoices against Purchase Register invoices.
 */
export function reconcileGstrData(gstrInvoices = [], prInvoices = [], tolerance = 1.0, options = {}) {
  const getHeaders = (list) => {
    if (!Array.isArray(list)) return [];
    for (const item of list) {
      if (item && typeof item === 'object') {
        const keys = Object.keys(item);
        if (keys.length > 0) return keys;
      }
    }
    return [];
  };

  const opts = (options && typeof options === 'object') ? options : {};
  const gstrHeaders = getHeaders(gstrInvoices);
  const prHeaders = getHeaders(prInvoices);
  const gstrMapping = opts.gstrMapping || opts.mapping || detectColumnMapping(gstrHeaders);
  const prMapping = opts.prMapping || opts.mapping || detectColumnMapping(prHeaders);

  const normGstr = gstrInvoices.map((inv, idx) =>
    normalizeInvoiceRecord(inv, gstrMapping, 'gstr_2b', idx)
  );
  const normPr = prInvoices.map((inv, idx) =>
    normalizeInvoiceRecord(inv, prMapping, 'purchase_register', idx)
  );

  if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error('Tolerance must be finite and non-negative.');
  const invalidRows = [...normGstr, ...normPr].filter(r => r.errors.length);
  const validGstr = normGstr.filter(r => !r.errors.length);
  const validPr = normPr.filter(r => !r.errors.length);
  const groups = new Map();
  for (const r of [...validGstr, ...validPr]) {
    if (r.isUnmatchable) continue;
    if (!groups.has(r.matchKey)) groups.set(r.matchKey, { gstr: [], pr: [] });
    groups.get(r.matchKey)[r.source === 'gstr_2b' ? 'gstr' : 'pr'].push(r);
  }
  const matches = [], mismatches = [], reviewRecords = [];
  const missingInPr = validGstr.filter(r => r.isUnmatchable);
  const missingIn2B = validPr.filter(r => r.isUnmatchable);
  for (const group of groups.values()) {
    const { gstr, pr } = group;
    if (gstr.length > 1 || pr.length > 1) {
      const all = [...gstr, ...pr];
      const collision = new Set(all.map(r => r.invoiceNumber.trim().toUpperCase())).size > 1;
      all.forEach(r => reviewRecords.push({ ...r, reviewReason: collision ? 'Invoice identifier normalization collision / duplicate candidates' : 'Ambiguous duplicate candidates' }));
      continue;
    }
    if (!gstr.length) { missingIn2B.push(...pr); continue; }
    if (!pr.length) { missingInPr.push(...gstr); continue; }
    const g2b = gstr[0], book = pr[0];
    const componentDiffs = {};
    let missingComponent = false;
    for (const key of ['igst', 'cgst', 'sgst', 'cess']) {
      componentDiffs[key] = g2b.taxPresent[key] && book.taxPresent[key] ? Math.abs(g2b[key] - book[key]) : null;
      if (g2b.taxPresent[key] !== book.taxPresent[key]) missingComponent = true;
    }
    if (missingComponent) {
      [g2b, book].forEach(r => reviewRecords.push({ ...r, reviewReason: 'Tax component missing in one source; explicit zero differs from missing.' }));
      continue;
    }
    const diff = Math.abs(g2b.taxableValue - book.taxableValue);
    const taxDiff = Math.abs(g2b.totalTax - book.totalTax);
    const matched = diff <= tolerance && Object.values(componentDiffs).every(d => d === null || d <= tolerance);
    const result = { gstr: g2b, pr: book, diff, taxableDiff: diff, taxDiff, componentDiffs,
      gstrValue: g2b.taxableValue, prValue: book.taxableValue,
      status: matched ? 'MATCHED' : 'VALUE_MISMATCH',
      identifierNormalizationUsed: g2b.invoiceNumber.toUpperCase() !== book.invoiceNumber.toUpperCase(),
      notes: (matched ? 'Matched within configured tolerances for available fields.' : 'Requires review: taxable value or tax components differ.') + (g2b.invoiceNumber.toUpperCase() !== book.invoiceNumber.toUpperCase() ? ' Original invoice identifiers differ in formatting; confirm the same invoice.' : '') };
    (matched ? matches : mismatches).push(result);
  }

  // Calculate Aggregates
  const totalGstrTaxable = validGstr.reduce((sum, r) => sum + r.taxableValue, 0);
  const totalPrTaxable = validPr.reduce((sum, r) => sum + r.taxableValue, 0);
  const matchedTaxable = matches.reduce((sum, m) => sum + m.gstr.taxableValue, 0);
  const mismatchTaxable = mismatches.reduce((sum, m) => sum + m.gstr.taxableValue, 0);
  const missingIn2BTaxable = missingIn2B.reduce((sum, r) => sum + r.taxableValue, 0);
  const missingInPrTaxable = missingInPr.reduce((sum, r) => sum + r.taxableValue, 0);

  const matchedTax = matches.reduce((sum, m) => sum + m.gstr.totalTax, 0);
  const atRiskTax = missingIn2B.reduce((sum, r) => sum + r.totalTax, 0);
  const unclaimedTax = missingInPr.reduce((sum, r) => sum + r.totalTax, 0);

  return {
    tolerance,
    invalidRows,
    reviewRecords,
    rowAccounting: { imported: normGstr.length + normPr.length,
      processed: 2 * (matches.length + mismatches.length) + missingInPr.length + missingIn2B.length,
      rejected: invalidRows.length, awaitingReview: reviewRecords.length },
    summary: {
      totalGstr: normGstr.length,
      totalPr: normPr.length,
      rejectedCount: invalidRows.length,
      reviewCount: reviewRecords.length,
      matchedCount: matches.length,
      mismatchCount: mismatches.length,
      missingIn2BCount: missingIn2B.length,
      missingInPrCount: missingInPr.length,
      totalGstrTaxable,
      totalPrTaxable,
      matchedTaxable,
      mismatchTaxable,
      missingIn2BTaxable,
      missingInPrTaxable,
      matchedTax,
      atRiskTax,
      unclaimedTax,
      formattedMatchedTax: formatINR(matchedTax),
      formattedAtRiskTax: formatINR(atRiskTax),
      formattedUnclaimedTax: formatINR(unclaimedTax),
    },
    matches,
    mismatches,
    missingIn2B,
    missingInPr,
  };
}

/**
 * Built-in Sample Datasets for 1-Click Demo
 */
export const SAMPLE_GSTR_DATA = [
  { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV/2026/001', invoiceDate: '2026-10-05', taxableValue: 100000, igst: 18000, cgst: 0, sgst: 0 },
  { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV/2026/002', invoiceDate: '2026-10-12', taxableValue: 250000, igst: 45000, cgst: 0, sgst: 0 },
  { gstin: '27XYZAB9876C1Z1', invoiceNumber: 'TX-8801', invoiceDate: '2026-10-15', taxableValue: 50000, igst: 0, cgst: 4500, sgst: 4500 },
  { gstin: '33KLMNO5555P1Z9', invoiceNumber: 'BILL-901', invoiceDate: '2026-10-20', taxableValue: 75000, igst: 13500, cgst: 0, sgst: 0 },
  { gstin: '07QQQAA1111B1Z2', invoiceNumber: 'INV-44', invoiceDate: '2026-10-25', taxableValue: 30000, igst: 5400, cgst: 0, sgst: 0 },
];

export const SAMPLE_PURCHASE_DATA = [
  { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV2026001', invoiceDate: '2026-10-05', taxableValue: 100000, igst: 18000, cgst: 0, sgst: 0 },
  { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV2026002', invoiceDate: '2026-10-12', taxableValue: 245000, igst: 44100, cgst: 0, sgst: 0 },
  { gstin: '27XYZAB9876C1Z1', invoiceNumber: 'TX8801', invoiceDate: '2026-10-15', taxableValue: 50000, igst: 0, cgst: 4500, sgst: 4500 },
  { gstin: '33KLMNO5555P1Z9', invoiceNumber: 'BILL901', invoiceDate: '2026-10-20', taxableValue: 75000, igst: 13500, cgst: 0, sgst: 0 },
  { gstin: '29ZZZYY9999K1Z0', invoiceNumber: 'INV-999', invoiceDate: '2026-10-22', taxableValue: 80000, igst: 14400, cgst: 0, sgst: 0 },
];
