import { describe, it, expect } from 'vitest';
import {
  reconcileGstrData,
  detectColumnMapping,
  normalizeInvoiceRecord,
  normalizeGstin,
  normalizeInvoiceNumber,
  parseAmount,
  parseDate,
  SAMPLE_GSTR_DATA,
  SAMPLE_PURCHASE_DATA,
} from './gstrReconciliationEngine.js';

describe('gstrReconciliationEngine', () => {
  describe('Normalization & Sanitization', () => {
    it('normalizes GSTIN removing whitespace and converting to uppercase', () => {
      expect(normalizeGstin('  29abcde1234f1z5 \t')).toBe('29ABCDE1234F1Z5');
      expect(normalizeGstin('29 ABCDE 1234 F1Z5')).toBe('29ABCDE1234F1Z5');
      expect(normalizeGstin(null)).toBe('');
    });

    it('normalizes invoice numbers removing slashes, hyphens, and whitespace', () => {
      expect(normalizeInvoiceNumber('INV/2026/001')).toBe('INV2026001');
      expect(normalizeInvoiceNumber('tx-8801')).toBe('TX8801');
      expect(normalizeInvoiceNumber('BILL # 901')).toBe('BILL901');
      expect(normalizeInvoiceNumber(null)).toBe('');
    });

    it('parses amounts removing Indian rupee symbols, commas, and whitespace', () => {
      expect(parseAmount('₹ 1,50,000.50')).toBe(150000.5);
      expect(parseAmount('25,000')).toBe(25000);
      expect(parseAmount('(50,000)')).toBe(-50000);
      expect(parseAmount('(₹ 1,200.50)')).toBe(-1200.5);
      expect(parseAmount('-50,000')).toBe(-50000);
      expect(parseAmount(null)).toBeNaN();
      expect(parseAmount('invalid')).toBeNaN();
    });

    it('parses diverse date formats (YYYY-MM-DD, DD/MM/YYYY)', () => {
      expect(parseDate('2026-10-31')).toBe('2026-10-31');
      expect(parseDate('15/10/2026')).toBe('2026-10-15');
      expect(parseDate('15-10-2026')).toBe('2026-10-15');
    });
  });

  describe('Reconciliation Categorization', () => {
    const gstrData = [
      { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-101', taxableValue: 50000 },
      { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-102', taxableValue: 75000 },
      { gstin: '27AABCT2345M1Z8', invoiceNumber: 'INV-201', taxableValue: 120000 },
    ];
    const prData = [
      { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-101', taxableValue: 50000 }, // exact match
      { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-102', taxableValue: 74500 }, // mismatch (₹500 diff)
      { gstin: '33AABCT9999K1ZZ', invoiceNumber: 'INV-301', taxableValue: 30000 }, // missing in 2B
    ];

    it('identifies exact matches where GSTIN, invoice number, and value match within tolerance', () => {
      const result = reconcileGstrData(gstrData, prData);
      expect(result.summary.matchedCount).toBe(1);
      expect(result.matches[0].gstr.invoiceNumber).toBe('INV-101');
      expect(result.matches[0].diff).toBe(0);
      expect(result.matches[0].status).toBe('MATCHED');
    });

    it('flags value discrepancies where invoice exists in both but values differ', () => {
      const result = reconcileGstrData(gstrData, prData);
      expect(result.summary.mismatchCount).toBe(1);
      expect(result.mismatches[0].gstr.invoiceNumber).toBe('INV-102');
      expect(result.mismatches[0].diff).toBe(500);
      expect(result.mismatches[0].status).toBe('VALUE_MISMATCH');
    });

    it('flags invoices in Purchase Register that are missing in GSTR-2B (At-risk ITC)', () => {
      const result = reconcileGstrData(gstrData, prData);
      expect(result.summary.missingIn2BCount).toBe(1);
      expect(result.missingIn2B[0].invoiceNumber).toBe('INV-301');
    });

    it('flags invoices in GSTR-2B that are missing in Purchase Register (Unclaimed ITC)', () => {
      const result = reconcileGstrData(gstrData, prData);
      expect(result.summary.missingInPrCount).toBe(1);
      expect(result.missingInPr[0].invoiceNumber).toBe('INV-201');
    });

    it('normalizes GSTIN whitespace and invoice number formatting (case, symbols)', () => {
      const gstr = [{ gstin: ' 29abcde1234f1z5 ', invoiceNumber: 'inv/101', taxableValue: 10000 }];
      const pr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV101', taxableValue: 10000 }];
      const result = reconcileGstrData(gstr, pr);
      expect(result.summary.matchedCount).toBe(1);
    });
  });

  describe('Tolerance Boundaries & Empty Sets', () => {
    it('matches invoices differing by exactly ₹1.00; ₹1.01 triggers mismatch', () => {
      const gstr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-01', taxableValue: 1000.00 }];
      const prExact1 = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-01', taxableValue: 1001.00 }];
      const prDiff101 = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-01', taxableValue: 1001.01 }];

      const resMatch = reconcileGstrData(gstr, prExact1, 1.0);
      expect(resMatch.summary.matchedCount).toBe(1);

      const resMismatch = reconcileGstrData(gstr, prDiff101, 1.0);
      expect(resMismatch.summary.mismatchCount).toBe(1);
    });

    it('handles empty datasets safely without crashing', () => {
      const res = reconcileGstrData([], []);
      expect(res.summary.matchedCount).toBe(0);
      expect(res.summary.mismatchCount).toBe(0);
      expect(res.summary.missingIn2BCount).toBe(0);
      expect(res.summary.missingInPrCount).toBe(0);
    });
  });

  describe('Realistic Sample Demo Data', () => {
    it('correctly reconciles built-in sample demo dataset', () => {
      const result = reconcileGstrData(SAMPLE_GSTR_DATA, SAMPLE_PURCHASE_DATA, 1.0);
      expect(result.summary.matchedCount).toBe(3);
      expect(result.summary.mismatchCount).toBe(1);
      expect(result.summary.missingIn2BCount).toBe(1);
      expect(result.summary.missingInPrCount).toBe(1);
      expect(result.mismatches[0].diff).toBe(5000);
      expect(result.missingIn2B[0].invoiceNumber).toBe('INV-999');
      expect(result.missingInPr[0].invoiceNumber).toBe('INV-44');
    });
  });

  describe('Intelligent Column Mapping Detection', () => {
    it('detects official GST Portal GSTR-2B headers accurately', () => {
      const portalHeaders = [
        'GSTIN of supplier',
        'Trade/Legal name',
        'Invoice number',
        'Invoice type',
        'Invoice Date',
        'Invoice Value (₹)',
        'Place of supply',
        'Supply Attract Reverse Charge',
        'Rate (%)',
        'Taxable Value (₹)',
        'Integrated Tax (₹)',
        'Central Tax (₹)',
        'State/UT Tax (₹)',
        'Cess (₹)',
        'ITC Availability',
      ];
      const mapping = detectColumnMapping(portalHeaders);
      expect(mapping.gstin).toBe('GSTIN of supplier');
      expect(mapping.invoiceNumber).toBe('Invoice number');
      expect(mapping.invoiceDate).toBe('Invoice Date');
      expect(mapping.taxableValue).toBe('Taxable Value (₹)');
      expect(mapping.igst).toBe('Integrated Tax (₹)');
      expect(mapping.cgst).toBe('Central Tax (₹)');
      expect(mapping.sgst).toBe('State/UT Tax (₹)');
    });

    it('detects Tally ERP and Tally Prime accounting headers', () => {
      const tallyHeaders = [
        'Date',
        'Particulars',
        'Vch Type',
        'Vch No.',
        'Party GSTIN',
        'Taxable Amount',
        'Integrated Tax',
        'Central Tax',
        'State Tax',
        'Total Amount',
      ];
      const mapping = detectColumnMapping(tallyHeaders);
      expect(mapping.gstin).toBe('Party GSTIN');
      expect(mapping.invoiceNumber).toBe('Vch No.');
      expect(mapping.invoiceDate).toBe('Date');
      expect(mapping.taxableValue).toBe('Taxable Amount');
      expect(mapping.igst).toBe('Integrated Tax');
      expect(mapping.cgst).toBe('Central Tax');
      expect(mapping.sgst).toBe('State Tax');
    });

    it('detects Busy Accounting export headers', () => {
      const busyHeaders = [
        'Supplier GSTIN',
        'Invoice No',
        'Inv Date',
        'Taxable Value',
        'IGST Amount',
        'CGST Amount',
        'SGST Amount',
      ];
      const mapping = detectColumnMapping(busyHeaders);
      expect(mapping.gstin).toBe('Supplier GSTIN');
      expect(mapping.invoiceNumber).toBe('Invoice No');
      expect(mapping.invoiceDate).toBe('Inv Date');
      expect(mapping.taxableValue).toBe('Taxable Value');
      expect(mapping.igst).toBe('IGST Amount');
      expect(mapping.cgst).toBe('CGST Amount');
      expect(mapping.sgst).toBe('SGST Amount');
    });

    it('handles dirty, mixed-case, and whitespace-padded headers', () => {
      const dirtyHeaders = [
        '  Supplier GSTIN  ',
        ' Invoice No. ',
        ' Inv Date ',
        ' Assessable Value ',
        ' IGST ',
        ' CGST ',
        ' UTGST ',
      ];
      const mapping = detectColumnMapping(dirtyHeaders);
      expect(mapping.gstin).toBe('  Supplier GSTIN  ');
      expect(mapping.invoiceNumber).toBe(' Invoice No. ');
      expect(mapping.invoiceDate).toBe(' Inv Date ');
      expect(mapping.taxableValue).toBe(' Assessable Value ');
      expect(mapping.igst).toBe(' IGST ');
      expect(mapping.cgst).toBe(' CGST ');
      expect(mapping.sgst).toBe(' UTGST ');
    });

    it('returns null fields for empty or missing headers safely', () => {
      const mapping = detectColumnMapping([]);
      expect(mapping.gstin).toBeNull();
      expect(mapping.invoiceNumber).toBeNull();
      expect(mapping.invoiceDate).toBeNull();
      expect(mapping.taxableValue).toBeNull();
      expect(mapping.igst).toBeNull();
      expect(mapping.cgst).toBeNull();
      expect(mapping.sgst).toBeNull();
    });
  });

  describe('End-to-End Reconciliation with Official GST Portal & Accounting Headers', () => {
    it('reconciles files using official GST Portal headers against Tally Purchase Register', () => {
      const gstrPortalData = [
        {
          'GSTIN of supplier': '29ABCDE1234F1Z5',
          'Trade/Legal name': 'ABC Corp',
          'Invoice number': 'INV/2026/001',
          'Invoice Date': '2026-10-05',
          'Invoice Value (₹)': '1,18,000.00',
          'Taxable Value (₹)': '1,00,000.00',
          'Integrated Tax (₹)': '18,000.00',
          'Central Tax (₹)': '0.00',
          'State/UT Tax (₹)': '0.00',
        },
        {
          'GSTIN of supplier': '27XYZAB9876C1Z1',
          'Trade/Legal name': 'XYZ Ltd',
          'Invoice number': 'TX-8801',
          'Invoice Date': '2026-10-15',
          'Invoice Value (₹)': '59,000.00',
          'Taxable Value (₹)': '50,000.00',
          'Integrated Tax (₹)': '0.00',
          'Central Tax (₹)': '4,500.00',
          'State/UT Tax (₹)': '4,500.00',
        },
        {
          'GSTIN of supplier': '33KLMNO5555P1Z9',
          'Trade/Legal name': 'KLM Traders',
          'Invoice number': 'BILL/901',
          'Invoice Date': '2026-10-20',
          'Invoice Value (₹)': '88,500.00',
          'Taxable Value (₹)': '75,000.00',
          'Integrated Tax (₹)': '13,500.00',
          'Central Tax (₹)': '0.00',
          'State/UT Tax (₹)': '0.00',
        },
      ];

      const prTallyData = [
        {
          'Party GSTIN': '29ABCDE1234F1Z5',
          'Vch No.': 'INV2026001',
          'Date': '05/10/2026',
          'Taxable Amount': '1,00,000.00',
          'Integrated Tax': '18,000.00',
          'Central Tax': '0.00',
          'State Tax': '0.00',
        },
        {
          'Party GSTIN': '27XYZAB9876C1Z1',
          'Vch No.': 'TX8801',
          'Date': '15/10/2026',
          'Taxable Amount': '50,250.00',
          'Integrated Tax': '0.00',
          'Central Tax': '4,522.50',
          'State Tax': '4,522.50',
        },
        {
          'Party GSTIN': '29ZZZYY9999K1Z0',
          'Vch No.': 'INV-999',
          'Date': '22/10/2026',
          'Taxable Amount': '80,000.00',
          'Integrated Tax': '14,400.00',
          'Central Tax': '0.00',
          'State Tax': '0.00',
        },
      ];

      const result = reconcileGstrData(gstrPortalData, prTallyData, 1.0);

      expect(result.summary.matchedCount).toBe(1);
      expect(result.summary.mismatchCount).toBe(1);
      expect(result.summary.missingInPrCount).toBe(1);
      expect(result.summary.missingIn2BCount).toBe(1);

      // Verify matched invoice fields
      expect(result.matches[0].gstr.gstin).toBe('29ABCDE1234F1Z5');
      expect(result.matches[0].gstr.invoiceNumber).toBe('INV/2026/001');
      expect(result.matches[0].gstr.taxableValue).toBe(100000);
      expect(result.matches[0].pr.taxableValue).toBe(100000);
      expect(result.matches[0].diff).toBe(0);
      expect(result.matches[0].status).toBe('MATCHED');

      // Verify mismatch
      expect(result.mismatches[0].gstr.invoiceNumber).toBe('TX-8801');
      expect(result.mismatches[0].diff).toBe(250);
      expect(result.mismatches[0].status).toBe('VALUE_MISMATCH');

      // Verify missing in PR (Unclaimed ITC from GSTR-2B)
      expect(result.missingInPr[0].invoiceNumber).toBe('BILL/901');
      expect(result.missingInPr[0].taxableValue).toBe(75000);

      // Verify missing in 2B (At-risk ITC from Books)
      expect(result.missingIn2B[0].invoiceNumber).toBe('INV-999');
      expect(result.missingIn2B[0].taxableValue).toBe(80000);
    });
  });

  describe('Guard Against Empty-Key Collisions & Unmatchable Invoices', () => {
    it('does NOT false-match records where both GSTIN and invoice number are blank', () => {
      const gstrEmpty = [
        { 'GSTIN of supplier': '', 'Invoice number': '', 'Taxable Value (₹)': '10,000' },
        { 'GSTIN of supplier': '   ', 'Invoice number': '   ', 'Taxable Value (₹)': '20,000' },
      ];
      const prEmpty = [
        { 'Party GSTIN': '', 'Vch No.': '', 'Taxable Amount': '10,000' },
        { 'Party GSTIN': '   ', 'Vch No.': '   ', 'Taxable Amount': '20,000' },
      ];

      const result = reconcileGstrData(gstrEmpty, prEmpty);
      expect(result.summary.matchedCount).toBe(0);
      expect(result.summary.mismatchCount).toBe(0);
      expect(result.summary.missingInPrCount).toBe(2);
      expect(result.summary.missingIn2BCount).toBe(2);
      expect(result.matches).toHaveLength(0);
      expect(result.mismatches).toHaveLength(0);
    });

    it('does NOT false-match records when invoice number is missing even if GSTIN matches', () => {
      const gstr = [
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: '', taxableValue: 50000 },
      ];
      const pr = [
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: '', taxableValue: 50000 },
      ];

      const result = reconcileGstrData(gstr, pr);
      expect(result.summary.matchedCount).toBe(0);
      expect(result.summary.missingInPrCount).toBe(1);
      expect(result.summary.missingIn2BCount).toBe(1);
    });

    it('does NOT false-match records when GSTIN is missing even if invoice number matches', () => {
      const gstr = [
        { gstin: '', invoiceNumber: 'INV-100', taxableValue: 50000 },
      ];
      const pr = [
        { gstin: '', invoiceNumber: 'INV-100', taxableValue: 50000 },
      ];

      const result = reconcileGstrData(gstr, pr);
      expect(result.summary.matchedCount).toBe(0);
      expect(result.summary.missingInPrCount).toBe(1);
      expect(result.summary.missingIn2BCount).toBe(1);
    });

    it('correctly matches valid invoices in a mixed dataset containing blank/corrupted rows', () => {
      const gstrMixed = [
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-1', taxableValue: 10000 },
        { gstin: '', invoiceNumber: '', taxableValue: 0 }, // blank row in portal export
        { gstin: '27XYZAB9876C1Z1', invoiceNumber: 'INV-2', taxableValue: 20000 },
      ];
      const prMixed = [
        { gstin: '', invoiceNumber: '', taxableValue: 0 }, // blank row in books export
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV1', taxableValue: 10000 },
        { gstin: '27XYZAB9876C1Z1', invoiceNumber: 'INV2', taxableValue: 20000 },
      ];

      const result = reconcileGstrData(gstrMixed, prMixed);
      expect(result.summary.matchedCount).toBe(2);
      expect(result.summary.mismatchCount).toBe(0);
      expect(result.summary.missingInPrCount).toBe(1);
      expect(result.summary.missingIn2BCount).toBe(1);
      expect(result.missingInPr[0].isUnmatchable).toBe(true);
      expect(result.missingIn2B[0].isUnmatchable).toBe(true);
    });
  });

  describe('normalizeInvoiceRecord Direct Verification', () => {
    it('sets isUnmatchable to true when essential identifiers are missing', () => {
      const emptyRec = normalizeInvoiceRecord({}, {}, 'gstr_2b', 0);
      expect(emptyRec.isUnmatchable).toBe(true);
      expect(emptyRec.matchKey).toMatch(/^__unmatchable_gstr_2b_0_/);

      const validRec = normalizeInvoiceRecord(
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-1' },
        {},
        'gstr_2b',
        1
      );
      expect(validRec.isUnmatchable).toBe(false);
      expect(validRec.matchKey).toBe('29ABCDE1234F1Z5::INV1');
    });

    it('correctly prioritizes column mapping over raw keys', () => {
      const raw = {
        'Custom Supplier': '29ABCDE1234F1Z5',
        'Custom Invoice': 'CUST-009',
        'Custom Val': '45000',
      };
      const mapping = {
        gstin: 'Custom Supplier',
        invoiceNumber: 'Custom Invoice',
        taxableValue: 'Custom Val',
      };
      const rec = normalizeInvoiceRecord(raw, mapping, 'purchase_register');
      expect(rec.gstin).toBe('29ABCDE1234F1Z5');
      expect(rec.invoiceNumber).toBe('CUST-009');
      expect(rec.taxableValue).toBe(45000);
      expect(rec.isUnmatchable).toBe(false);
    });
  });
});
