/**
 * GSTR-2B vs Purchase Register (Books) Reconciliation Engine
 * High-precision reconciliation between GST Portal GSTR-2B filing and internal Purchase Register.
 * Matches on Supplier GSTIN, Normalized Invoice Number, and Taxable Value.
 * Identifies Matched ITC, Value Mismatches, At-Risk ITC (in Books only), and Unclaimed ITC (in 2B only).
 */

import { formatINR } from '../../lib/toolFormat.js';

export function normalizeGstin(gstin) {
  return String(gstin || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeInvoiceNumber(inv) {
  return String(inv || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function parseAmount(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  const isNegative = str.startsWith('(') && str.endsWith(')');
  const cleaned = str.replace(/[₹,()\s]/g, '').trim();
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return isNegative ? -n : n;
}

export function parseDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel date serial number
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // Standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return str;
}

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
  };
}

let unmatchableSeq = 0;
export function generateUnmatchableKey(source = 'record', index = 0) {
  unmatchableSeq += 1;
  return `__unmatchable_${source}_${index}_${unmatchableSeq}__`;
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
    : (r.taxableValue ?? r['Taxable Value'] ?? r['Taxable Value (₹)'] ?? r.taxableAmount ?? r['Taxable Amount'] ?? r['Assessable Value'] ?? 0);

  const rawIgst = (mapping.igst && r[mapping.igst] !== undefined)
    ? r[mapping.igst]
    : (r.igst ?? r.IGST ?? r['Integrated Tax'] ?? r['Integrated Tax (₹)'] ?? r['IGST Amount'] ?? 0);

  const rawCgst = (mapping.cgst && r[mapping.cgst] !== undefined)
    ? r[mapping.cgst]
    : (r.cgst ?? r.CGST ?? r['Central Tax'] ?? r['Central Tax (₹)'] ?? r['CGST Amount'] ?? 0);

  const rawSgst = (mapping.sgst && r[mapping.sgst] !== undefined)
    ? r[mapping.sgst]
    : (r.sgst ?? r.SGST ?? r['State/UT Tax'] ?? r['State/UT Tax (₹)'] ?? r['State Tax'] ?? r['SGST Amount'] ?? 0);

  const taxableValue = parseAmount(rawTaxable);
  const igst = parseAmount(rawIgst);
  const cgst = parseAmount(rawCgst);
  const sgst = parseAmount(rawSgst);
  const totalTax = igst + cgst + sgst;

  const normGstin = normalizeGstin(rawGstin);
  const normInvoice = normalizeInvoiceNumber(rawInvoice);
  const isUnmatchable = !normGstin || !normInvoice;
  const matchKey = isUnmatchable
    ? generateUnmatchableKey(source, index)
    : `${normGstin}::${normInvoice}`;

  return {
    source,
    gstin: String(rawGstin || '').trim(),
    normalizedGstin: normGstin,
    invoiceNumber: String(rawInvoice || '').trim(),
    normalizedInvoiceNumber: normInvoice,
    invoiceDate: parseDate(rawDate),
    taxableValue,
    igst,
    cgst,
    sgst,
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

  // Group purchase register by key: GSTIN::INVOICE
  const prMap = new Map();
  normPr.forEach((pr, idx) => {
    if (!pr.isUnmatchable) {
      const key = pr.matchKey;
      if (!prMap.has(key)) {
        prMap.set(key, []);
      }
      prMap.get(key).push({ record: pr, prIndex: idx });
    }
  });

  const matches = [];
  const mismatches = [];
  const missingInPr = [];
  const matchedPrIndices = new Set();

  for (let gIdx = 0; gIdx < normGstr.length; gIdx++) {
    const g2b = normGstr[gIdx];

    // If GSTR record is unmatchable (missing GSTIN or invoice number), treat as missing in PR
    if (g2b.isUnmatchable) {
      missingInPr.push(g2b);
      continue;
    }

    const key = g2b.matchKey;
    const prCandidates = prMap.get(key) || [];

    // Find available candidate not already matched
    let matchedCandidate = null;
    let candidateIndex = -1;

    for (const cand of prCandidates) {
      if (!matchedPrIndices.has(cand.prIndex)) {
        matchedCandidate = cand.record;
        candidateIndex = cand.prIndex;
        break;
      }
    }

    if (!matchedCandidate) {
      // In 2B but not in Books -> Unclaimed ITC!
      missingInPr.push(g2b);
    } else {
      matchedPrIndices.add(candidateIndex);
      const valDiff = Math.abs(g2b.taxableValue - matchedCandidate.taxableValue);
      const taxDiff = Math.abs(g2b.totalTax - matchedCandidate.totalTax);

      if (valDiff <= tolerance) {
        matches.push({
          gstr: g2b,
          pr: matchedCandidate,
          diff: valDiff,
          taxDiff,
          status: 'MATCHED',
          notes: 'Full match within tolerance. Safe for ITC claim.',
        });
      } else {
        mismatches.push({
          gstr: g2b,
          pr: matchedCandidate,
          gstrValue: g2b.taxableValue,
          prValue: matchedCandidate.taxableValue,
          diff: valDiff,
          taxDiff,
          status: 'VALUE_MISMATCH',
          notes: `Value mismatch of ₹${valDiff.toFixed(2)}. Verify credit/debit notes or amended invoice.`,
        });
      }
    }
  }

  // Identify invoices in PR missing in GSTR-2B -> Ineligible / At-Risk ITC!
  const missingIn2B = [];
  normPr.forEach((pr, idx) => {
    if (!matchedPrIndices.has(idx)) {
      missingIn2B.push(pr);
    }
  });

  // Calculate Aggregates
  const totalGstrTaxable = normGstr.reduce((sum, r) => sum + r.taxableValue, 0);
  const totalPrTaxable = normPr.reduce((sum, r) => sum + r.taxableValue, 0);
  const matchedTaxable = matches.reduce((sum, m) => sum + m.gstr.taxableValue, 0);
  const mismatchTaxable = mismatches.reduce((sum, m) => sum + m.gstr.taxableValue, 0);
  const missingIn2BTaxable = missingIn2B.reduce((sum, r) => sum + r.taxableValue, 0);
  const missingInPrTaxable = missingInPr.reduce((sum, r) => sum + r.taxableValue, 0);

  const matchedTax = matches.reduce((sum, m) => sum + m.gstr.totalTax, 0);
  const atRiskTax = missingIn2B.reduce((sum, r) => sum + r.totalTax, 0);
  const unclaimedTax = missingInPr.reduce((sum, r) => sum + r.totalTax, 0);

  return {
    summary: {
      totalGstr: normGstr.length,
      totalPr: normPr.length,
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
