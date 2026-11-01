import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';

import {
  formatINR,
  formatIndianDenomination,
  formatDownloadFilename,
} from '../src/lib/toolFormat.js';

import {
  calculatePayslip,
  amountToWords,
} from '../src/tools/finance/payslipEngine.js';

import {
  calculateTds,
  isValidPan,
} from '../src/tools/finance/tdsEngine.js';

import {
  calculatePfEsi,
} from '../src/tools/finance/pfEsiEngine.js';

import {
  generateSalarySheet,
} from '../src/tools/finance/salarySheetEngine.js';

import {
  reconcileGstrData,
  normalizeInvoiceNumber,
  SAMPLE_GSTR_DATA,
  SAMPLE_PURCHASE_DATA,
} from '../src/tools/finance/gstrReconciliationEngine.js';

describe('Adversarial Verification Suite for Milestone 2', () => {
  // =========================================================================
  // 1. Indian Numbering & Currency Formatting
  // =========================================================================
  describe('Indian Numbering & Lakh / Crore Formatting', () => {
    it('formats exact lakh boundaries with formatINR and formatIndianDenomination', () => {
      // 1 Lakh = 1,00,000
      expect(formatINR(100000)).toBe('₹ 1,00,000');
      expect(formatIndianDenomination(100000)).toBe('1 Lakh');

      // 10 Lakh = 10,00,000
      expect(formatINR(1000000)).toBe('₹ 10,00,000');
      expect(formatIndianDenomination(1000000)).toBe('10 Lakh');

      // 25.5 Lakh = 25,50,000
      expect(formatINR(2550000)).toBe('₹ 25,50,000');
      expect(formatIndianDenomination(2550000)).toBe('25.5 Lakh');
    });

    it('formats exact crore boundaries including extreme value ₹10 Crore', () => {
      // 1 Crore = 1,00,00,000
      expect(formatINR(10000000)).toBe('₹ 1,00,00,000');
      expect(formatIndianDenomination(10000000)).toBe('1 Crore');

      // 10 Crore = 10,00,00,000
      expect(formatINR(100000000)).toBe('₹ 10,00,00,000');
      expect(formatIndianDenomination(100000000)).toBe('10 Crore');

      // 15.75 Crore
      expect(formatINR(157500000)).toBe('₹ 15,75,00,000');
      expect(formatIndianDenomination(157500000)).toBe('15.75 Crore');
    });

    it('converts numbers to Indian English words across Lakh and Crore boundaries', () => {
      expect(amountToWords(0)).toBe('Rupees Zero Only');
      expect(amountToWords(100000)).toBe('Rupees One Lakh Only');
      expect(amountToWords(10000000)).toBe('Rupees One Crore Only');
      expect(amountToWords(100000000)).toBe('Rupees Ten Crore Only');
      expect(amountToWords(1000000000)).toBe('Rupees One Hundred Crore Only');
    });

    it('handles negative, non-numeric, and zero values gracefully', () => {
      expect(formatINR(0)).toBe('₹ 0');
      expect(formatINR(-50000)).toBe('- ₹ 50,000');
      expect(formatINR(NaN)).toBe('₹ 0');
      expect(formatINR(null)).toBe('₹ 0');
      expect(formatIndianDenomination(0)).toBe('0');
      expect(formatIndianDenomination(-100000000)).toBe('-10 Crore');
    });
  });

  // =========================================================================
  // 2. Boundary Values: Zero Income & Non-Positive Inputs
  // =========================================================================
  describe('Boundary Values: Zero & Negative Income', () => {
    it('Payslip Engine: handles zero annual CTC without throwing NaN or crashing', () => {
      const slip = calculatePayslip({ annualCtc: 0 });
      expect(slip.monthlyGross).toBe(0);
      expect(slip.basic).toBe(0);
      expect(slip.hra).toBe(0);
      expect(slip.allowances).toBe(0);
      expect(slip.employeePf).toBe(0);
      expect(slip.employeeEsi).toBe(0);
      expect(slip.professionalTax).toBe(0);
      expect(slip.tds).toBe(0);
      expect(slip.totalDeductions).toBe(0);
      expect(slip.netSalary).toBe(0);
      expect(slip.netSalaryInWords).toBe('Rupees Zero Only');
      expect(slip.formattedGross).toBe('₹ 0');
      expect(slip.formattedNetSalary).toBe('0');
    });

    it('Payslip Engine: handles negative annual CTC by clamping to zero', () => {
      const slip = calculatePayslip({ annualCtc: -100000 });
      expect(slip.monthlyGross).toBe(0);
      expect(slip.netSalary).toBe(0);
      expect(slip.totalDeductions).toBe(0);
    });

    it('TDS Engine: handles zero transaction amount', () => {
      const res = calculateTds({ section: '194J', amount: 0 });
      expect(res.tdsAmount).toBe(0);
      expect(res.netPayable).toBe(0);
      expect(res.isExempt).toBe(true);
    });

    it('PF & ESI Engine: handles zero basic and zero gross', () => {
      const res = calculatePfEsi({ basicSalary: 0, grossSalary: 0 });
      expect(res.employeePf).toBe(0);
      expect(res.employerEpf).toBe(0);
      expect(res.employerEps).toBe(0);
      expect(res.employeeEsi).toBe(0);
      expect(res.employerEsi).toBe(0);
      expect(res.isEsiEligible).toBe(false);
      expect(res.totalStatutoryRemittance).toBe(0);
      expect(res.netPayAfterStatutory).toBe(0);
    });

    it('Salary Sheet Engine: handles empty team list and zero salary employee', () => {
      const emptySheet = generateSalarySheet({ employees: [] });
      expect(emptySheet.employeeCount).toBe(0);
      expect(emptySheet.totalGross).toBe(0);
      expect(emptySheet.totalNet).toBe(0);
      expect(emptySheet.rows).toEqual([]);

      const zeroEmpSheet = generateSalarySheet({
        employees: [{ id: 'E0', name: 'Zero Gross', monthlyGross: 0, paidDays: 30 }],
      });
      expect(zeroEmpSheet.totalGross).toBe(0);
      expect(zeroEmpSheet.totalNet).toBe(0);
      expect(zeroEmpSheet.rows[0].netSalary).toBe(0);
    });

    it('GSTR-2B Engine: handles empty invoice lists', () => {
      const recon = reconcileGstrData([], []);
      expect(recon.summary.totalGstr).toBe(0);
      expect(recon.summary.totalPr).toBe(0);
      expect(recon.summary.matchedCount).toBe(0);
      expect(recon.matches).toEqual([]);
      expect(recon.mismatches).toEqual([]);
    });
  });

  // =========================================================================
  // 3. Boundary Values: Extreme Income (₹10 Crore)
  // =========================================================================
  describe('Boundary Values: Extreme Income (₹10 Crore)', () => {
    it('Payslip Engine: calculates ₹10 Crore annual CTC with statutory PF capping', () => {
      const slip = calculatePayslip({
        annualCtc: 100000000, // ₹10 Cr
        capPf: true,
        regime: 'new',
        state: 'Karnataka',
      });

      // Gross is around 8.33 Million/month
      expect(slip.monthlyGross).toBeGreaterThan(8000000);
      // EPF is strictly capped at ₹1,800/month
      expect(slip.employeePf).toBe(1800);
      expect(slip.employerPf).toBe(1800);
      // ESI is 0 because gross is vastly above ₹21,000 ceiling
      expect(slip.employeeEsi).toBe(0);
      // Professional tax in Karnataka capped at ₹200
      expect(slip.professionalTax).toBe(200);
      // TDS is substantial (top slab 30% + cess)
      expect(slip.tds).toBeGreaterThan(2000000);
      // Net salary is positive and correctly formatted: ~₹57.68 Lakh/month
      expect(slip.netSalary).toBeGreaterThan(5000000);
      expect(slip.netSalaryInWords).toContain('Fifty Seven Lakh');

      // Now test with monthly gross of ₹2 Crore (yields monthly net salary > ₹1 Crore)
      const slip2CrMonthly = calculatePayslip({
        fixedMonthlyGross: 20000000, // ₹2 Crore / month
        capPf: true,
        regime: 'new',
      });
      expect(slip2CrMonthly.netSalary).toBeGreaterThan(10000000); // > ₹1 Crore net
      expect(slip2CrMonthly.netSalaryInWords).toContain('Crore');
    });

    it('TDS Engine: calculates TDS on ₹10 Crore payment across major sections', () => {
      // 194J Professional (10%)
      const prof10Cr = calculateTds({
        section: '194J',
        amount: 100000000,
        subType: 'professional',
        panProvided: true,
        pan: 'ABCDE1234F',
      });
      expect(prof10Cr.rate).toBe(0.10);
      expect(prof10Cr.tdsAmount).toBe(10000000); // ₹1 Crore
      expect(prof10Cr.netPayable).toBe(90000000); // ₹9 Crore

      // 194C Contractor Company (2%)
      const comp10Cr = calculateTds({
        section: '194C',
        amount: 100000000,
        recipientType: 'company',
        panProvided: true,
        pan: 'ABCDE1234F',
      });
      expect(comp10Cr.rate).toBe(0.02);
      expect(comp10Cr.tdsAmount).toBe(2000000); // ₹20 Lakh
      expect(comp10Cr.netPayable).toBe(98000000);
    });

    it('PF & ESI Engine: handles ₹10 Crore basic with and without cap', () => {
      const capped = calculatePfEsi({
        basicSalary: 100000000,
        grossSalary: 100000000,
        capPf: true,
      });
      expect(capped.employeePf).toBe(1800);
      expect(capped.employerEps).toBe(1250);
      expect(capped.employerEdli).toBe(75);
      expect(capped.employeeEsi).toBe(0);

      const uncapped = calculatePfEsi({
        basicSalary: 100000000,
        grossSalary: 100000000,
        capPf: false,
      });
      expect(uncapped.employeePf).toBe(12000000); // 12% of 10 Cr = 1.2 Cr
      // EPS is statutory capped even in uncapped mode
      expect(uncapped.employerEps).toBe(1250);
    });
  });

  // =========================================================================
  // 4. Leap Year Attendance (29 Days in February)
  // =========================================================================
  describe('Boundary Values: Leap Year Attendance (29 Days in Feb)', () => {
    it('Payslip Engine: calculates 100% payout when paidDays equals 29 in Feb', () => {
      const slipFullFeb = calculatePayslip({
        fixedMonthlyGross: 58000,
        daysInMonth: 29,
        paidDays: 29,
        capPf: true,
        optPf: false,
        customTds: 0,
      });
      expect(slipFullFeb.proration).toBe(1.0);
      expect(slipFullFeb.monthlyGross).toBe(58000);
      expect(slipFullFeb.lopDays).toBe(0);
    });

    it('Payslip Engine: prorates precisely for fractional/partial days in 29-day month', () => {
      const slipHalfFeb = calculatePayslip({
        fixedMonthlyGross: 58000,
        daysInMonth: 29,
        paidDays: 14.5,
        capPf: true,
        optPf: false,
        customTds: 0,
      });
      expect(slipHalfFeb.proration).toBeCloseTo(0.5, 4);
      expect(slipHalfFeb.monthlyGross).toBe(29000);
      expect(slipHalfFeb.lopDays).toBe(14.5);
    });

    it('Payslip Engine: clamps paidDays > daysInMonth (e.g. 30 days entered for Feb 29)', () => {
      const slipOverFeb = calculatePayslip({
        fixedMonthlyGross: 58000,
        daysInMonth: 29,
        paidDays: 30, // Invalid over-attendance
        capPf: true,
      });
      expect(slipOverFeb.paidDays).toBe(29);
      expect(slipOverFeb.proration).toBe(1.0);
      expect(slipOverFeb.lopDays).toBe(0);
    });

    it('Salary Sheet Engine: correctly prorates team roster for 29-day February', () => {
      const team = [
        { id: 'E1', name: 'Alice', monthlyGross: 58000, paidDays: 29, optPf: false, tds: 0 },
        { id: 'E2', name: 'Bob', monthlyGross: 58000, paidDays: 14.5, optPf: false, tds: 0 },
        { id: 'E3', name: 'Charlie', monthlyGross: 58000, paidDays: 31, optPf: false, tds: 0 }, // Should clamp to 29
      ];
      const sheet = generateSalarySheet({ employees: team, daysInMonth: 29 });
      expect(sheet.daysInMonth).toBe(29);
      expect(sheet.rows[0].proration).toBe(1.0);
      expect(sheet.rows[0].proratedGross).toBe(58000);
      expect(sheet.rows[1].proratedGross).toBe(29000);
      expect(sheet.rows[2].paidDays).toBe(29);
      expect(sheet.rows[2].proratedGross).toBe(58000);
    });
  });

  // =========================================================================
  // 5. Section 206AA: Missing / Invalid PAN in TDS
  // =========================================================================
  describe('Section 206AA Penal Rate on Missing or Invalid PAN', () => {
    it('enforces flat 20% penal rate when panProvided is false regardless of section threshold', () => {
      // 194C contractor amount ₹20,000 is below the ₹30,000 threshold, but without PAN 206AA applies
      const noPanBelowThreshold = calculateTds({
        section: '194C',
        amount: 20000,
        panProvided: false,
      });
      expect(noPanBelowThreshold.isPenal).toBe(true);
      expect(noPanBelowThreshold.rate).toBe(0.20);
      expect(noPanBelowThreshold.tdsAmount).toBe(4000); // 20% of 20,000
      expect(noPanBelowThreshold.reason).toContain('Section 206AA');
    });

    it('enforces flat 20% penal rate when an invalid PAN format is entered', () => {
      const invalidPans = ['12345', 'ABCDE12345', 'ABCDE123', 'A1B2C3D4E5'];
      for (const badPan of invalidPans) {
        const res = calculateTds({
          section: '194J',
          amount: 50000,
          panProvided: true,
          pan: badPan,
        });
        expect(res.isPenal).toBe(true);
        expect(res.rate).toBe(0.20);
        expect(res.tdsAmount).toBe(10000); // 20% of 50,000
      }
    });

    it('validates authentic PAN format without false positives or false negatives', () => {
      expect(isValidPan('ABCDE1234F')).toBe(true);
      expect(isValidPan('abcde1234f')).toBe(true);
      expect(isValidPan('ZZZZZ9999Z')).toBe(true);
      expect(isValidPan('ABCDE12345')).toBe(false);
      expect(isValidPan('ABCD12345F')).toBe(false);
      expect(isValidPan('')).toBe(false);
      expect(isValidPan(null)).toBe(false);
    });

    it('applies standard lower statutory rates when valid PAN is provided', () => {
      const valid = calculateTds({
        section: '194C',
        amount: 50000,
        recipientType: 'individual',
        panProvided: true,
        pan: 'ABCDE1234F',
      });
      expect(valid.isPenal).toBe(false);
      expect(valid.rate).toBe(0.01); // 1% for individual contractor
      expect(valid.tdsAmount).toBe(500);
    });
  });

  // =========================================================================
  // 6. ESI Statutory Wage Ceiling Edge Cases (₹21,000 vs ₹21,001)
  // =========================================================================
  describe('ESI Statutory Wage Ceiling Boundary: ₹21,000 vs ₹21,001', () => {
    it('PF and ESI Engine: exact standard boundary at ₹21,000 (eligible) vs ₹21,001 (ineligible)', () => {
      // At ₹21,000: ESI is eligible
      const atCeiling = calculatePfEsi({ basicSalary: 21000, grossSalary: 21000 });
      expect(atCeiling.isEsiEligible).toBe(true);
      expect(atCeiling.employeeEsi).toBe(Math.round(21000 * 0.0075)); // 158
      expect(atCeiling.employerEsi).toBe(Math.round(21000 * 0.0325)); // 683

      // At ₹21,001: ESI is ineligible (exceeds statutory ceiling)
      const aboveCeiling = calculatePfEsi({ basicSalary: 21001, grossSalary: 21001 });
      expect(aboveCeiling.isEsiEligible).toBe(false);
      expect(aboveCeiling.employeeEsi).toBe(0);
      expect(aboveCeiling.employerEsi).toBe(0);
    });

    it('PF and ESI Engine: exact disability boundary at ₹25,000 vs ₹25,001', () => {
      // At ₹25,000 with disability: eligible
      const atDisability = calculatePfEsi({
        basicSalary: 25000,
        grossSalary: 25000,
        hasDisability: true,
      });
      expect(atDisability.isEsiEligible).toBe(true);
      expect(atDisability.employeeEsi).toBe(Math.round(25000 * 0.0075)); // 188
      expect(atDisability.employerEsi).toBe(Math.round(25000 * 0.0325)); // 813

      // At ₹25,001 with disability: ineligible
      const aboveDisability = calculatePfEsi({
        basicSalary: 25001,
        grossSalary: 25001,
        hasDisability: true,
      });
      expect(aboveDisability.isEsiEligible).toBe(false);
      expect(aboveDisability.employeeEsi).toBe(0);
      expect(aboveDisability.employerEsi).toBe(0);
    });

    it('Payslip Engine: applies ESI at ₹21,000 and drops to ₹0 at ₹21,001', () => {
      const atCeiling = calculatePayslip({ fixedMonthlyGross: 21000 });
      expect(atCeiling.employeeEsi).toBe(158);
      expect(atCeiling.employerEsi).toBe(683);

      const aboveCeiling = calculatePayslip({ fixedMonthlyGross: 21001 });
      expect(aboveCeiling.employeeEsi).toBe(0);
      expect(aboveCeiling.employerEsi).toBe(0);
    });

    it('Salary Sheet Engine: applies ESI at ₹21,000 and drops to ₹0 at ₹21,001', () => {
      const sheet = generateSalarySheet({
        employees: [
          { id: 'E1', name: 'At Ceiling', monthlyGross: 21000, paidDays: 30 },
          { id: 'E2', name: 'Above Ceiling', monthlyGross: 21001, paidDays: 30 },
        ],
        daysInMonth: 30,
      });
      expect(sheet.rows[0].esi).toBe(158);
      expect(sheet.rows[1].esi).toBe(0);
    });
  });

  // =========================================================================
  // 7. PDF and Excel Exports Robustness
  // =========================================================================
  describe('PDF and Excel Export Integrity (No Runtime Exceptions / Rejections)', () => {
    it('PDF Export: generates valid PDF document without WinAnsi encoding crash for special symbols', async () => {
      const sanitizeForPdf = text =>
        String(text || '')
          .replace(/₹/g, 'Rs. ')
          .replace(/[^\x20-\x7E\n]/g, '');

      const slip = calculatePayslip({
        annualCtc: 1200000,
        employee: {
          name: 'Rahul Sharma — Senior VP & "Specialist"',
          id: 'EMP-1001',
          pan: 'ABCDE1234F',
        },
        company: {
          name: 'Acme & Co. (India) Pvt. Ltd.',
          address: 'Tower A, #100, M.G. Road, Bengaluru ₹560001',
          monthYear: 'October 2026',
        },
      });

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Verify that sanitizing prevents WinAnsi unhandled crash
      const sanitizedName = sanitizeForPdf(slip.employee.name);
      const sanitizedCompany = sanitizeForPdf(slip.company.name);
      const sanitizedAddress = sanitizeForPdf(slip.company.address);

      expect(() => {
        page.drawText(sanitizedName, { x: 50, y: 700, font: fontBold, size: 12, color: rgb(0, 0, 0) });
        page.drawText(sanitizedCompany, { x: 50, y: 680, font: fontReg, size: 10, color: rgb(0, 0, 0) });
        page.drawText(sanitizedAddress, { x: 50, y: 660, font: fontReg, size: 9, color: rgb(0, 0, 0) });
      }).not.toThrow();

      const pdfBytes = await pdfDoc.save();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(100);
      // Verify valid PDF magic header (%PDF-)
      const header = String.fromCharCode(...pdfBytes.subarray(0, 5));
      expect(header).toBe('%PDF-');
    });

    it('Excel Export: Payslip workbook exports cleanly via SheetJS', () => {
      const slip = calculatePayslip({ annualCtc: 1500000 });
      const wb = XLSX.utils.book_new();
      const data = [
        ['WORKORBIT SALARY PAYSLIP'],
        ['Company Name', slip.company.name],
        ['Gross Earnings', slip.monthlyGross],
        ['Net Salary', slip.netSalary],
        ['Net Salary in Words', slip.netSalaryInWords],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Payslip');

      expect(() => {
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        expect(out.byteLength).toBeGreaterThan(1000);
      }).not.toThrow();
    });

    it('Excel Export: GSTR-2B Reconciliation workbook exports with all sub-sheets and empty sets', () => {
      const recon = reconcileGstrData(SAMPLE_GSTR_DATA, SAMPLE_PURCHASE_DATA);
      const wb = XLSX.utils.book_new();

      const summaryData = [
        ['Reconciliation Summary'],
        ['Matched Count', recon.summary.matchedCount],
        ['Mismatch Count', recon.summary.mismatchCount],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      if (recon.matches.length > 0) {
        const wsMatched = XLSX.utils.json_to_sheet(recon.matches.map(m => ({
          GSTIN: m.gstr.gstin,
          Invoice: m.gstr.invoiceNumber,
          Value: m.gstr.taxableValue,
        })));
        XLSX.utils.book_append_sheet(wb, wsMatched, 'Matched');
      }

      expect(() => {
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        expect(out.byteLength).toBeGreaterThan(1000);
      }).not.toThrow();
    });

    it('Excel Export: Salary Sheet workbook exports cleanly for large teams', () => {
      const largeTeam = Array.from({ length: 50 }, (_, i) => ({
        id: `EMP${String(i + 1).padStart(3, '0')}`,
        name: `Employee ${i + 1}`,
        designation: 'Engineer',
        monthlyGross: 60000 + i * 1000,
        paidDays: 28,
        optPf: true,
        tds: 2000,
      }));

      const sheet = generateSalarySheet({ employees: largeTeam, daysInMonth: 30 });
      const wb = XLSX.utils.book_new();
      const allRows = [
        ['SALARY SHEET - 50 EMPLOYEES'],
        ['Employee ID', 'Name', 'Gross', 'Net'],
        ...sheet.rows.map(r => [r.employeeId, r.name, r.proratedGross, r.netSalary]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Roster');

      expect(() => {
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        expect(out.byteLength).toBeGreaterThan(2000);
      }).not.toThrow();
    });

    it('verifies standardized orbitboard-<toolslug>.<format> download filenames', () => {
      expect(formatDownloadFilename('payslip-generator', 'pdf')).toBe('orbitboard-payslip-generator.pdf');
      expect(formatDownloadFilename('payslip-generator', 'xlsx')).toBe('orbitboard-payslip-generator.xlsx');
      expect(formatDownloadFilename('gstr-2b-reconciliation', 'xlsx')).toBe('orbitboard-gstr-2b-reconciliation.xlsx');
      expect(formatDownloadFilename('salary-sheet-excel', 'xlsx')).toBe('orbitboard-salary-sheet-excel.xlsx');
    });
  });

  // =========================================================================
  // 8. Deep Edge Cases: GSTR-2B Invoicing Artifacts & Resilient Matching
  // =========================================================================
  describe('GSTR-2B Invoicing Artifacts & Resilient Matching', () => {
    it('normalizes invoice numbers with diverse punctuation, spaces, and casing', () => {
      expect(normalizeInvoiceNumber('inv/2026-001')).toBe('INV2026001');
      expect(normalizeInvoiceNumber('  TX # 992-B  ')).toBe('TX992B');
      expect(normalizeInvoiceNumber('BILL_2026/OCT/04')).toBe('BILL2026OCT04');
    });

    it('matches invoices with casing, whitespace, and formatting differences', () => {
      const gstr = [
        { gstin: ' 29abcde1234f1z5 ', invoiceNumber: 'inv/2026-001', taxableValue: '₹ 1,00,000', igst: '18,000' },
      ];
      const pr = [
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV2026001', taxableValue: 100000, igst: 18000 },
      ];
      const recon = reconcileGstrData(gstr, pr, 1.0);
      expect(recon.summary.matchedCount).toBe(1);
      expect(recon.summary.mismatchCount).toBe(0);
      expect(recon.matches[0].status).toBe('MATCHED');
    });

    it('distinguishes between tolerance match (<= ₹1.0) and value mismatch (> ₹1.0)', () => {
      const gstr = [
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV1', taxableValue: 10000.50 },
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV2', taxableValue: 10000.00 },
      ];
      const pr = [
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV1', taxableValue: 10001.00 }, // diff = 0.50 <= 1.0 -> MATCHED
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV2', taxableValue: 10001.50 }, // diff = 1.50 > 1.0 -> MISMATCH
      ];
      const recon = reconcileGstrData(gstr, pr, 1.0);
      expect(recon.summary.matchedCount).toBe(1);
      expect(recon.summary.mismatchCount).toBe(1);
      expect(recon.matches[0].gstr.invoiceNumber).toBe('INV1');
      expect(recon.mismatches[0].gstr.invoiceNumber).toBe('INV2');
    });

    it('handles duplicate invoice numbers across different GSTINs without cross-contamination', () => {
      const gstr = [
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-101', taxableValue: 50000 },
        { gstin: '27XYZAB9876C1Z1', invoiceNumber: 'INV-101', taxableValue: 75000 },
      ];
      const pr = [
        { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV101', taxableValue: 50000 },
        { gstin: '27XYZAB9876C1Z1', invoiceNumber: 'INV101', taxableValue: 75000 },
      ];
      const recon = reconcileGstrData(gstr, pr, 0);
      expect(recon.summary.matchedCount).toBe(2);
      expect(recon.summary.mismatchCount).toBe(0);
    });
  });

  // =========================================================================
  // 9. Deep Edge Cases: Statutory Threshold Transitions
  // =========================================================================
  describe('Statutory Threshold Transitions for TDS', () => {
    it('Section 194C: strictly transitions at ₹30,000 boundary', () => {
      const atBoundary = calculateTds({ section: '194C', amount: 30000 });
      expect(atBoundary.isExempt).toBe(true);
      expect(atBoundary.tdsAmount).toBe(0);

      const aboveBoundary = calculateTds({ section: '194C', amount: 30001, recipientType: 'individual' });
      expect(aboveBoundary.isExempt).toBe(false);
      expect(aboveBoundary.tdsAmount).toBe(300); // 1% of 30,001 = 300.01 rounded to 300
    });

    it('Section 194H: strictly transitions at ₹15,000 boundary', () => {
      const atBoundary = calculateTds({ section: '194H', amount: 15000 });
      expect(atBoundary.isExempt).toBe(true);
      expect(atBoundary.tdsAmount).toBe(0);

      const aboveBoundary = calculateTds({ section: '194H', amount: 15001 });
      expect(aboveBoundary.isExempt).toBe(false);
      expect(aboveBoundary.tdsAmount).toBe(750); // 5% of 15,001 = 750
    });

    it('Section 194I: strictly transitions at ₹2,40,000 boundary', () => {
      const atBoundary = calculateTds({ section: '194I', amount: 240000, subType: 'building' });
      expect(atBoundary.isExempt).toBe(true);
      expect(atBoundary.tdsAmount).toBe(0);

      const aboveBoundary = calculateTds({ section: '194I', amount: 240001, subType: 'building' });
      expect(aboveBoundary.isExempt).toBe(false);
      expect(aboveBoundary.tdsAmount).toBe(24000); // 10% of 240,001 = 24,000
    });

    it('Section 194J: strictly transitions at ₹30,000 boundary', () => {
      const atBoundary = calculateTds({ section: '194J', amount: 30000, subType: 'professional' });
      expect(atBoundary.isExempt).toBe(true);
      expect(atBoundary.tdsAmount).toBe(0);

      const aboveBoundary = calculateTds({ section: '194J', amount: 30001, subType: 'professional' });
      expect(aboveBoundary.isExempt).toBe(false);
      expect(aboveBoundary.tdsAmount).toBe(3000); // 10% of 30,001 = 3,000
    });
  });
});
