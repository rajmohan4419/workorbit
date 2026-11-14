/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  PROJECT_ROOT,
  readProjectFile,
  readProjectJson,
  computeCspHash,
  loadModule,
} from './harness.js';

// Dynamically load project modules
const planCatalogModule = await loadModule('src/lib/monetization/planCatalog.js');
const entitlementsModule = await loadModule('src/lib/monetization/entitlements.js');
const serverEntitlementsModule = await loadModule('api/_lib/entitlements.js');
const toolFormatModule = await loadModule('src/lib/toolFormat.js');
const payslipEngine = await loadModule('src/tools/finance/payslipEngine.js');
const gstrEngine = await loadModule('src/tools/finance/gstrReconciliationEngine.js');
const tdsEngine = await loadModule('src/tools/finance/tdsEngine.js');
const pfEsiEngine = await loadModule('src/tools/finance/pfEsiEngine.js');
const salarySheetEngine = await loadModule('src/tools/finance/salarySheetEngine.js');
const toolCatalogModule = await loadModule('src/data/toolCatalog.js');
const analyticsModule = await loadModule('src/lib/analytics.js');
const cookieConsentModule = await loadModule('src/lib/cookieConsent.js');

describe('Tier 5: White-Box Adversarial Coverage Hardening Suite', () => {

  // =========================================================================
  // 1. Currency Formatting Extremes (src/lib/toolFormat.js)
  // =========================================================================
  describe('1. Currency & Number Formatting Extremes', () => {
    it('T5.1.1: formatINR handles non-numeric, null, undefined, empty, and NaN inputs safely returning "₹ 0"', () => {
      expect(toolFormatModule.formatINR(NaN)).toBe('₹ 0');
      expect(toolFormatModule.formatINR(null)).toBe('₹ 0');
      expect(toolFormatModule.formatINR(undefined)).toBe('₹ 0');
      expect(toolFormatModule.formatINR('')).toBe('₹ 0');
      expect(toolFormatModule.formatINR('not-a-number')).toBe('₹ 0');
      expect(toolFormatModule.formatINR({})).toBe('₹ 0');
      expect(toolFormatModule.formatINR([])).toBe('₹ 0');
    });

    it('T5.1.2: formatINR correctly formats negative zero (-0) without producing "- ₹ 0"', () => {
      const formattedNegZero = toolFormatModule.formatINR(-0);
      expect(formattedNegZero).toBe('₹ 0');
      expect(formattedNegZero).not.toBe('- ₹ 0');
    });

    it('T5.1.3: formatINR handles negative amounts with decimal precision', () => {
      expect(toolFormatModule.formatINR(-50000)).toBe('- ₹ 50,000');
      expect(toolFormatModule.formatINR(-1250000.75, 2)).toBe('- ₹ 12,50,000.75');
      expect(toolFormatModule.formatINR(-0.5, 2)).toBe('- ₹ 0.50');
    });

    it('T5.1.4: formatINR formats extreme monetary boundaries (₹100 Crore and ₹1 Lakh Crore)', () => {
      // ₹100 Crore = 1,00,00,00,000
      expect(toolFormatModule.formatINR(1000000000)).toBe('₹ 1,00,00,00,000');
      // ₹1 Lakh Crore = 10,00,00,00,00,000
      expect(toolFormatModule.formatINR(1000000000000)).toBe('₹ 10,00,00,00,00,000');
    });

    it('T5.1.5: formatIndianDenomination returns "0" for invalid/corrupted inputs', () => {
      expect(toolFormatModule.formatIndianDenomination(NaN)).toBe('0');
      expect(toolFormatModule.formatIndianDenomination(null)).toBe('0');
      expect(toolFormatModule.formatIndianDenomination(undefined)).toBe('0');
      expect(toolFormatModule.formatIndianDenomination('garbage')).toBe('0');
      expect(toolFormatModule.formatIndianDenomination(0)).toBe('0');
      expect(toolFormatModule.formatIndianDenomination(-0)).toBe('0');
    });

    it('T5.1.6: formatIndianDenomination transitions seamlessly at exact boundaries (Lakh vs Crore)', () => {
      // Boundary right below 1 Lakh
      expect(toolFormatModule.formatIndianDenomination(99999)).toBe('99,999');
      // Exactly 1 Lakh
      expect(toolFormatModule.formatIndianDenomination(100000)).toBe('1 Lakh');
      // 25.75 Lakh
      expect(toolFormatModule.formatIndianDenomination(2575000)).toBe('25.75 Lakh');
      // Boundary right below 1 Crore
      expect(toolFormatModule.formatIndianDenomination(9999999)).toBe('100 Lakh');
      // Exactly 1 Crore
      expect(toolFormatModule.formatIndianDenomination(10000000)).toBe('1 Crore');
      // 15.5 Crore
      expect(toolFormatModule.formatIndianDenomination(155000000)).toBe('15.5 Crore');
    });

    it('T5.1.7: formatIndianDenomination handles negative denominations cleanly', () => {
      expect(toolFormatModule.formatIndianDenomination(-500000)).toBe('-5 Lakh');
      expect(toolFormatModule.formatIndianDenomination(-20000000)).toBe('-2 Crore');
      expect(toolFormatModule.formatIndianDenomination(-25000)).toBe('-25,000');
    });

    it('T5.1.8: formatDownloadFilename standardizes extensions and avoids duplicate orbitboard prefixes', () => {
      // Clean prefix addition
      expect(toolFormatModule.formatDownloadFilename('payslip', 'pdf')).toBe('orbitboard-payslip.pdf');
      // Redundant prefix avoidance
      expect(toolFormatModule.formatDownloadFilename('orbitboard-payslip', 'pdf')).toBe('orbitboard-payslip.pdf');
      // Leading dot and uppercase normalization
      expect(toolFormatModule.formatDownloadFilename('salary-sheet', '.XLSX')).toBe('orbitboard-salary-sheet.xlsx');
      // Empty parameters fallback
      expect(toolFormatModule.formatDownloadFilename('', '')).toBe('orbitboard-file.dat');
      expect(toolFormatModule.formatDownloadFilename(null, null)).toBe('orbitboard-file.dat');
    });
  });

  // =========================================================================
  // 2. Financial Calculation Engines Adversarial Boundaries & Type Coercion
  // =========================================================================
  describe('2. Calculation Engine Adversarial Stress Tests', () => {

    // --- Payslip Engine ---
    describe('Payslip Engine Boundaries', () => {
      it('T5.2.1: calculatePayslip handles zero or negative CTC gracefully with zero deductions and net pay', () => {
        const zeroPayslip = payslipEngine.calculatePayslip({ annualCtc: 0 });
        expect(zeroPayslip.monthlyGross).toBe(0);
        expect(zeroPayslip.basic).toBe(0);
        expect(zeroPayslip.hra).toBe(0);
        expect(zeroPayslip.allowances).toBe(0);
        expect(zeroPayslip.employeePf).toBe(0);
        expect(zeroPayslip.employeeEsi).toBe(0);
        expect(zeroPayslip.professionalTax).toBe(0);
        expect(zeroPayslip.tds).toBe(0);
        expect(zeroPayslip.netSalary).toBe(0);
        expect(zeroPayslip.netSalaryInWords).toBe('Rupees Zero Only');

        const negPayslip = payslipEngine.calculatePayslip({ annualCtc: -1000000 });
        expect(negPayslip.monthlyGross).toBe(0);
        expect(negPayslip.netSalary).toBe(0);
      });

      it('T5.2.2: calculatePayslip handles extreme CTC (₹100 Crore) with statutory PF capping and correct word conversion', () => {
        const highPayslip = payslipEngine.calculatePayslip({ annualCtc: 1000000000 }); // 100 Crore
        expect(highPayslip.monthlyGross).toBeGreaterThan(80000000);
        // EPF must remain strictly capped at ₹1,800/mo regardless of massive earnings
        expect(highPayslip.employeePf).toBe(1800);
        expect(highPayslip.netSalary).toBeGreaterThan(0);
        expect(highPayslip.netSalaryInWords).toContain('Crore');
      });

      it('T5.2.3: calculatePayslip proration handles 0 paid days, negative paid days, and overflow clamping', () => {
        // 0 paid days = 100% loss of pay
        const zeroDays = payslipEngine.calculatePayslip({ annualCtc: 1200000, daysInMonth: 30, paidDays: 0 });
        expect(zeroDays.proration).toBe(0);
        expect(zeroDays.monthlyGross).toBe(0);
        expect(zeroDays.netSalary).toBe(0);
        expect(zeroDays.lopDays).toBe(30);

        // Negative paid days clamped to 0
        const negDays = payslipEngine.calculatePayslip({ annualCtc: 1200000, daysInMonth: 30, paidDays: -5 });
        expect(negDays.paidDays).toBe(0);
        expect(negDays.proration).toBe(0);

        // Paid days overflow (> 30) clamped to daysInMonth
        const overflow = payslipEngine.calculatePayslip({ annualCtc: 1200000, daysInMonth: 30, paidDays: 45 });
        expect(overflow.paidDays).toBe(30);
        expect(overflow.proration).toBe(1);
        expect(overflow.lopDays).toBe(0);
      });

      it('T5.2.4: calculatePayslip ESI threshold strictly switches at ₹21,000 (normal) and ₹25,000 (disability)', () => {
        // Exactly at standard ceiling
        const atNormal = payslipEngine.calculatePayslip({ fixedMonthlyGross: 21000, hasDisability: false });
        expect(atNormal.employeeEsi).toBe(Math.round(21000 * 0.0075));

        // ₹1 above standard ceiling
        const aboveNormal = payslipEngine.calculatePayslip({ fixedMonthlyGross: 21001, hasDisability: false });
        expect(aboveNormal.employeeEsi).toBe(0);

        // Exactly at disability ceiling
        const atDisability = payslipEngine.calculatePayslip({ fixedMonthlyGross: 25000, hasDisability: true });
        expect(atDisability.employeeEsi).toBe(Math.round(25000 * 0.0075));

        // ₹1 above disability ceiling
        const aboveDisability = payslipEngine.calculatePayslip({ fixedMonthlyGross: 25001, hasDisability: true });
        expect(aboveDisability.employeeEsi).toBe(0);
      });

      it('T5.2.5: amountToWords handles fractional paise, exact lakhs, and negative amounts', () => {
        expect(payslipEngine.amountToWords(0)).toBe('Rupees Zero Only');
        expect(payslipEngine.amountToWords(1500.75)).toBe('Rupees One Thousand Five Hundred and Seventy Five Paise Only');
        expect(payslipEngine.amountToWords(500000)).toBe('Rupees Five Lakh Only');
        expect(payslipEngine.amountToWords(-250)).toBe('Negative Rupees Two Hundred Fifty Only');
      });
    });

    // --- GSTR-2B vs Purchase Register Reconciler ---
    describe('GSTR-2B Reconciliation Engine Boundaries', () => {
      it('T5.2.6: reconcileGstrData handles empty datasets and null inputs without throwing', () => {
        const result = gstrEngine.reconcileGstrData([], [], 1.0);
        expect(result.summary.totalGstr).toBe(0);
        expect(result.summary.totalPr).toBe(0);
        expect(result.summary.matchedCount).toBe(0);
        expect(result.summary.mismatchCount).toBe(0);
        expect(result.matches).toEqual([]);
        expect(result.mismatches).toEqual([]);
        expect(result.missingIn2B).toEqual([]);
        expect(result.missingInPr).toEqual([]);
      });

      it('T5.2.7: parseAmount handles currency symbols, accounting parens, and non-numeric inputs', () => {
        expect(gstrEngine.parseAmount('(45,000.50)')).toBe(-45000.50);
        expect(gstrEngine.parseAmount('₹ 1,50,000')).toBe(150000);
        expect(gstrEngine.parseAmount(null)).toBeNaN();
        expect(gstrEngine.parseAmount(undefined)).toBeNaN();
        expect(gstrEngine.parseAmount('N/A')).toBeNaN();
        expect(gstrEngine.parseAmount(25000)).toBe(25000);
      });

      it('T5.2.8: normalizeInvoiceNumber and normalizeGstin clean spaces, slashes, and casing', () => {
        expect(gstrEngine.normalizeGstin('  29abcde1234f1z5 \n')).toBe('29ABCDE1234F1Z5');
        expect(gstrEngine.normalizeInvoiceNumber('inv/2026-001a')).toBe('INV2026001A');
        expect(gstrEngine.normalizeInvoiceNumber('')).toBe('');
      });

      it('T5.2.9: unmatchable records (missing GSTIN or invoice number) are segregated into missing arrays', () => {
        const gstr = [
          { gstin: '', invoiceNumber: 'INV01', taxableValue: 10000 }, // missing GSTIN
          { gstin: '29ABCDE1234F1Z5', invoiceNumber: '', taxableValue: 20000 }, // missing invoice #
        ];
        const pr = [
          { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV01', taxableValue: 10000 },
        ];
        const result = gstrEngine.reconcileGstrData(gstr, pr);
        // Neither gstr record can match pr
        expect(result.summary.matchedCount).toBe(0);
        expect(result.summary.missingInPrCount).toBe(2);
        expect(result.summary.missingIn2BCount).toBe(1);
      });

      it('T5.2.10: duplicate invoices in Purchase Register are not double-counted against a single GSTR-2B entry', () => {
        const gstr = [
          { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-100', taxableValue: 50000, igst: 9000 },
        ];
        const pr = [
          { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-100', taxableValue: 50000, igst: 9000 }, // copy 1
          { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-100', taxableValue: 50000, igst: 9000 }, // copy 2 (duplicate in books!)
        ];
        const result = gstrEngine.reconcileGstrData(gstr, pr);
        // No arbitrary first-candidate match: all three imported rows require review.
        expect(result.summary.matchedCount).toBe(0);
        expect(result.summary.missingIn2BCount).toBe(0);
        expect(result.reviewRecords).toHaveLength(3);
        expect(result.reviewRecords.filter(r => r.source === 'purchase_register')).toHaveLength(2);
        expect(result.rowAccounting).toEqual({ imported: 3, processed: 0, rejected: 0, awaitingReview: 3 });
      });

      it('T5.2.11: tolerance parameter boundary strictly partitions MATCHED vs VALUE_MISMATCH', () => {
        const gstr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-1', taxableValue: 10000.00 }];
        const prExact = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-1', taxableValue: 10001.00 }];
        const prBeyond = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-1', taxableValue: 10001.01 }];

        // Diff 1.00 with tolerance 1.0 -> MATCHED
        const resExact = gstrEngine.reconcileGstrData(gstr, prExact, 1.0);
        expect(resExact.summary.matchedCount).toBe(1);
        expect(resExact.summary.mismatchCount).toBe(0);

        // Diff 1.01 with tolerance 1.0 -> VALUE_MISMATCH
        const resBeyond = gstrEngine.reconcileGstrData(gstr, prBeyond, 1.0);
        expect(resBeyond.summary.matchedCount).toBe(0);
        expect(resBeyond.summary.mismatchCount).toBe(1);
      });
    });

    // --- TDS Calculator Engine ---
    describe('TDS Engine Boundaries & Section 206AA Penalties', () => {
      it('T5.2.12: Section 206AA penal rate of 20% strictly applies when PAN is missing or invalid', () => {
        // Missing PAN flag
        const noPan = tdsEngine.calculateTds({ section: '194C', amount: 50000, panProvided: false });
        expect(noPan.isPenal).toBe(true);
        expect(noPan.rate).toBe(0.20);
        expect(noPan.tdsAmount).toBe(10000);

        // Corrupted PAN format (e.g. 9 chars instead of 10)
        const badPan = tdsEngine.calculateTds({ section: '194J', amount: 100000, pan: 'ABCDE1234' });
        expect(badPan.isPenal).toBe(true);
        expect(badPan.rate).toBe(0.20);
        expect(badPan.tdsAmount).toBe(20000);

        // Valid PAN format
        const validPan = tdsEngine.calculateTds({ section: '194J', amount: 100000, pan: 'ABCDE1234F', subType: 'technical' });
        expect(validPan.isPenal).toBe(false);
        expect(validPan.rate).toBe(0.02); // 2% technical rate
        expect(validPan.tdsAmount).toBe(2000);
      });

      it('T5.2.13: Section 194A threshold strictly distinguishes normal (₹40,000) and senior citizen (₹50,000)', () => {
        // Normal non-senior at ₹40,000 is exempt
        expect(tdsEngine.calculateTds({ section: '194A', amount: 40000, isSenior: false }).isExempt).toBe(true);
        // Normal non-senior at ₹40,001 is taxable
        expect(tdsEngine.calculateTds({ section: '194A', amount: 40001, isSenior: false }).isExempt).toBe(false);

        // Senior citizen at ₹50,000 is exempt
        expect(tdsEngine.calculateTds({ section: '194A', amount: 50000, isSenior: true }).isExempt).toBe(true);
        // Senior citizen at ₹50,001 is taxable
        expect(tdsEngine.calculateTds({ section: '194A', amount: 50001, isSenior: true }).isExempt).toBe(false);
      });

      it('T5.2.14: Section 194C recipient type differentiates individual (1%) vs company (2%)', () => {
        const ind = tdsEngine.calculateTds({ section: '194C', amount: 50000, recipientType: 'individual' });
        expect(ind.rate).toBe(0.01);
        expect(ind.tdsAmount).toBe(500);

        const comp = tdsEngine.calculateTds({ section: '194C', amount: 50000, recipientType: 'company' });
        expect(comp.rate).toBe(0.02);
        expect(comp.tdsAmount).toBe(1000);
      });

      it('T5.2.15: Section 194I subType differentiates machinery (2%) vs building (10%)', () => {
        const machinery = tdsEngine.calculateTds({ section: '194I', amount: 300000, subType: 'machinery' });
        expect(machinery.rate).toBe(0.02);
        expect(machinery.tdsAmount).toBe(6000);

        const building = tdsEngine.calculateTds({ section: '194I', amount: 300000, subType: 'building' });
        expect(building.rate).toBe(0.10);
        expect(building.tdsAmount).toBe(30000);
      });

      it('T5.2.16: Section 192 respects ₹75k standard deduction and ₹12L Section 87A rebate in new regime', () => {
        // Gross ₹12 Lakh under new regime: after ₹75k standard deduction = ₹11.25L taxable <= ₹12L -> 0 tax
        const rebateCase = tdsEngine.calculateTds({ section: '192', amount: 1200000, regime: 'new' });
        expect(rebateCase.isExempt).toBe(true);
        expect(rebateCase.tdsAmount).toBe(0);

        // Gross ₹15 Lakh: taxable income exceeds ₹12L rebate limit
        const taxableCase = tdsEngine.calculateTds({ section: '192', amount: 1500000, regime: 'new' });
        expect(taxableCase.isExempt).toBe(false);
        expect(taxableCase.tdsAmount).toBeGreaterThan(0);
      });

      it('T5.2.17: unknown section throws explicit error', () => {
        expect(() => tdsEngine.calculateTds({ section: '999INVALID', amount: 10000 }))
          .toThrow(/Unknown TDS section/);
      });
    });

    // --- PF & ESI Statutory Calculator Engine ---
    describe('PF & ESI Statutory Engine Boundaries', () => {
      it('T5.2.18: calculatePfEsi caps EPF employee contribution at ₹1,800 when capPf is true', () => {
        // High basic pay ₹80,000
        const capped = pfEsiEngine.calculatePfEsi({ basicSalary: 80000, capPf: true });
        expect(capped.employeePf).toBe(1800);
        expect(capped.employerEps).toBe(1250);
        expect(capped.employerEpf).toBe(550);

        // When uncapped, employee pays full 12% on basic, but EPS remains strictly capped at 15k
        const uncapped = pfEsiEngine.calculatePfEsi({ basicSalary: 80000, capPf: false });
        expect(uncapped.employeePf).toBe(9600); // 12% of 80,000
        expect(uncapped.employerEps).toBe(1250); // EPS always capped at ₹1,250
        expect(uncapped.employerEpf).toBe(8350); // 9600 - 1250
      });

      it('T5.2.19: calculatePfEsi EDLI is strictly capped at ₹75 (0.5% of ₹15,000 ceiling)', () => {
        const res = pfEsiEngine.calculatePfEsi({ basicSalary: 50000 });
        expect(res.employerEdli).toBe(75);
      });

      it('T5.2.20: daily average wage <= ₹176 exempts employee from ESI share while employer still contributes', () => {
        const exemptEmp = pfEsiEngine.calculatePfEsi({
          basicSalary: 4500,
          grossSalary: 4500,
          dailyWage: 150, // <= 176
        });
        expect(exemptEmp.isEsiEligible).toBe(true);
        expect(exemptEmp.employeeEsi).toBe(0); // employee exempt!
        expect(exemptEmp.employerEsi).toBe(Math.round(4500 * 0.0325)); // employer pays 3.25%
      });

      it('T5.2.21: calculatePfEsi accepts custom table-driven statutory config without hardcoded values', () => {
        const customPfConfig = {
          ...pfEsiEngine.PF_STATUTORY_CONFIG,
          wageCeilingMonthly: 20000,
          employeeEpfRate: 0.10, // 10%
          maxCappedEmployeeMonthly: 2000,
        };
        const customRes = pfEsiEngine.calculatePfEsi({
          basicSalary: 30000,
          capPf: true,
          pfConfig: customPfConfig,
        });
        expect(customRes.employeePf).toBe(2000);
      });
    });

    // --- Salary Sheet Engine ---
    describe('Salary Sheet Engine Boundaries', () => {
      it('T5.2.22: generateSalarySheet handles empty employee lists without errors', () => {
        const emptySheet = salarySheetEngine.generateSalarySheet({ employees: [] });
        expect(emptySheet.employeeCount).toBe(0);
        expect(emptySheet.totalGross).toBe(0);
        expect(emptySheet.totalNet).toBe(0);
        expect(emptySheet.rows).toEqual([]);
      });

      it('T5.2.23: generateSalarySheet attendance proration handles zero days, negative days, and opt-out PF', () => {
        const team = [
          { id: 'E1', name: 'On Leave', monthlyGross: 60000, paidDays: 0, optPf: true },
          { id: 'E2', name: 'PF Opt-out', monthlyGross: 50000, paidDays: 30, optPf: false },
          { id: 'E3', name: 'Invalid Days', monthlyGross: 40000, paidDays: 'invalid', optPf: true },
        ];
        const sheet = salarySheetEngine.generateSalarySheet({ employees: team, daysInMonth: 30 });

        // E1 has 0 paid days -> 0 gross, 0 net
        expect(sheet.rows[0].proratedGross).toBe(0);
        expect(sheet.rows[0].netSalary).toBe(0);

        // E2 opted out of PF -> pf is 0
        expect(sheet.rows[1].pf).toBe(0);

        // E3 invalid days defaults to full month (30 days)
        expect(sheet.rows[2].paidDays).toBe(30);
        expect(sheet.rows[2].proratedGross).toBe(40000);
      });

      it('T5.2.24: generateSalarySheet row values strictly sum to aggregate totals', () => {
        const team = [
          { id: 'E1', monthlyGross: 150000, paidDays: 30, optPf: true, tds: 10000 },
          { id: 'E2', monthlyGross: 80000, paidDays: 25, optPf: true, tds: 4000 },
          { id: 'E3', monthlyGross: 20000, paidDays: 28, optPf: false, tds: 0 },
        ];
        const sheet = salarySheetEngine.generateSalarySheet({ employees: team, daysInMonth: 30 });

        const computedGross = sheet.rows.reduce((sum, r) => sum + r.proratedGross, 0);
        const computedPf = sheet.rows.reduce((sum, r) => sum + r.pf, 0);
        const computedEsi = sheet.rows.reduce((sum, r) => sum + r.esi, 0);
        const computedPt = sheet.rows.reduce((sum, r) => sum + r.pt, 0);
        const computedTds = sheet.rows.reduce((sum, r) => sum + r.tds, 0);
        const computedDeductions = sheet.rows.reduce((sum, r) => sum + r.totalDeductions, 0);
        const computedNet = sheet.rows.reduce((sum, r) => sum + r.netSalary, 0);

        expect(sheet.totalGross).toBe(computedGross);
        expect(sheet.totalPf).toBe(computedPf);
        expect(sheet.totalEsi).toBe(computedEsi);
        expect(sheet.totalPt).toBe(computedPt);
        expect(sheet.totalTds).toBe(computedTds);
        expect(sheet.totalDeductions).toBe(computedDeductions);
        expect(sheet.totalNet).toBe(computedNet);
      });
    });
  });

  // =========================================================================
  // 3. Server Entitlements Fail-Closed Security & Quota Boundaries
  // =========================================================================
  describe('3. Server Entitlement Fail-Closed Security & Quota Boundaries', () => {
    it('T5.3.1: resolveEntitlements fails closed to Free plan on corrupted, NaN, or non-finite current_period_end', () => {
      const corruptedSubs = [
        { plan_code: 'pro_monthly', status: 'active', current_period_end: 'CORRUPTED_STRING' },
        { plan_code: 'pro_monthly', status: 'active', current_period_end: null },
        { plan_code: 'pro_monthly', status: 'active', current_period_end: undefined },
        { plan_code: 'pro_monthly', status: 'active', current_period_end: NaN },
        { plan_code: 'pro_monthly', status: 'active', current_period_end: '2026-99-99T99:99:99Z' },
      ];

      for (const sub of corruptedSubs) {
        const ent = entitlementsModule.resolveEntitlements(sub);
        expect(ent.planCode).toBe('free');
        expect(ent.isPaid).toBe(false);
        expect(ent.features.advanced_exports).toBe(false);
      }
    });

    it('T5.3.2: resolveEntitlements fails closed when subscription expired 1ms in the past', () => {
      const baseNow = new Date('2026-10-31T12:00:00.000Z');
      const expiredSub = {
        plan_code: 'pro_monthly',
        status: 'active',
        current_period_end: new Date(baseNow.getTime() - 1).toISOString(), // 1ms ago
      };
      const ent = entitlementsModule.resolveEntitlements(expiredSub, baseNow);
      expect(ent.planCode).toBe('free');
      expect(ent.isPaid).toBe(false);
    });

    it('T5.3.3: resolveEntitlements fails closed on non-active statuses (past_due, halted, cancelled, trialing)', () => {
      const nonActiveStatuses = ['past_due', 'halted', 'cancelled', 'trialing', 'unpaid', 'incomplete', null, undefined];
      const futureEnd = new Date(Date.now() + 86400000).toISOString();

      for (const status of nonActiveStatuses) {
        const sub = { plan_code: 'pro_monthly', status, current_period_end: futureEnd };
        const ent = entitlementsModule.resolveEntitlements(sub);
        expect(ent.planCode).toBe('free');
        expect(ent.isPaid).toBe(false);
      }
    });

    it('T5.3.4: resolveEntitlements fails closed to Free when plan_code is invalid or injection attempt', () => {
      const injectionSub = {
        plan_code: 'enterprise_god_mode',
        status: 'active',
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
      };
      const ent = entitlementsModule.resolveEntitlements(injectionSub);
      expect(ent.planCode).toBe('free');
      expect(ent.isPaid).toBe(false);
      expect(ent.features.advanced_exports).toBe(false);
    });

    it('T5.3.5: getBearerToken safely extracts token or returns null on malformed headers', () => {
      expect(serverEntitlementsModule.getBearerToken(null)).toBeNull();
      expect(serverEntitlementsModule.getBearerToken({})).toBeNull();
      expect(serverEntitlementsModule.getBearerToken({ headers: {} })).toBeNull();
      expect(serverEntitlementsModule.getBearerToken({ headers: { authorization: 'Basic user:pass' } })).toBeNull();
      expect(serverEntitlementsModule.getBearerToken({ headers: { authorization: 'Bearer' } })).toBeNull();
      expect(serverEntitlementsModule.getBearerToken({ headers: { authorization: 'Bearer   ' } })).toBeNull();
      expect(serverEntitlementsModule.getBearerToken({ headers: { authorization: 'Bearer my.jwt.token' } })).toBe('my.jwt.token');
      expect(serverEntitlementsModule.getBearerToken({ headers: { authorization: 'bearer my.jwt.token' } })).toBe('my.jwt.token');
    });

    it('T5.3.6: getUserFromRequest returns null without throwing when Supabase client throws or errors', async () => {
      // Mock admin that throws exception
      const throwingAdmin = {
        auth: {
          getUser: async () => {
            throw new Error('Database connection reset');
          },
        },
      };
      const req = { headers: { authorization: 'Bearer some-token' } };
      const user = await serverEntitlementsModule.getUserFromRequest(req, throwingAdmin);
      expect(user).toBeNull();

      // Mock admin returning auth error
      const errorAdmin = {
        auth: {
          getUser: async () => ({ data: null, error: { message: 'Token expired' } }),
        },
      };
      const userErr = await serverEntitlementsModule.getUserFromRequest(req, errorAdmin);
      expect(userErr).toBeNull();
    });

    it('T5.3.7: requireEntitlement enforces 401 when token is missing or invalid', async () => {
      const mockAdmin = { auth: { getUser: async () => ({ data: null }) } };
      const unauthReq = { headers: {} };
      const res = await serverEntitlementsModule.requireEntitlement(unauthReq, mockAdmin, 'advanced_exports');
      expect(res.authorized).toBe(false);
      expect(res.status).toBe(401);
      expect(res.error).toBe('sign_in_required');
    });

    it('T5.3.8: requireEntitlement enforces 403 when authenticated user lacks the required feature', async () => {
      // Mock user on Free plan
      const mockAdmin = {
        auth: {
          getUser: async () => ({ data: { user: { id: 'usr-123' } } }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              in: () => ({
                gt: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null, error: null }), // No active subscription
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
      const req = { headers: { authorization: 'Bearer valid-jwt' } };
      const res = await serverEntitlementsModule.requireEntitlement(req, mockAdmin, 'advanced_exports');
      expect(res.authorized).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toBe('feature_not_entitled');
      expect(res.feature).toBe('advanced_exports');
    });

    it('T5.3.9: quota limit progression across all commercial plans is strictly monotonic', () => {
      const free = planCatalogModule.PLAN_CATALOG.free;
      const proM = planCatalogModule.PLAN_CATALOG.pro_monthly;
      const proA = planCatalogModule.PLAN_CATALOG.pro_annual;
      const busM = planCatalogModule.PLAN_CATALOG.business_monthly;
      const busA = planCatalogModule.PLAN_CATALOG.business_annual;

      // advanced_export quotas
      expect(free.limits.advanced_export).toBe(0);
      expect(proM.limits.advanced_export).toBe(100);
      expect(proA.limits.advanced_export).toBe(1200);
      expect(busM.limits.advanced_export).toBe(500);
      expect(busA.limits.advanced_export).toBe(6000);

      // bulk_job quotas
      expect(free.limits.bulk_job).toBe(0);
      expect(proM.limits.bulk_job).toBe(30);
      expect(proA.limits.bulk_job).toBe(360);
      expect(busM.limits.bulk_job).toBe(200);
      expect(busA.limits.bulk_job).toBe(2400);

      // business_workflow quotas (business tier exclusive)
      expect(free.limits.business_workflow).toBe(0);
      expect(proM.limits.business_workflow).toBe(0);
      expect(busM.limits.business_workflow).toBe(100);
      expect(busA.limits.business_workflow).toBe(1200);
    });

    it('T5.3.10: getFeatureLimit and hasFeature helpers handle missing or invalid feature keys safely', () => {
      const ent = entitlementsModule.resolveEntitlements(null);
      expect(entitlementsModule.hasFeature(ent, 'non_existent_feature')).toBe(false);
      expect(entitlementsModule.hasFeature(null, 'advanced_exports')).toBe(false);

      expect(entitlementsModule.getFeatureLimit(ent, 'non_existent_feature')).toBe(0);
      expect(entitlementsModule.getFeatureLimit(null, 'advanced_export')).toBe(0);
    });
  });

  // =========================================================================
  // 4. Prerenderer, Sitemap Edge Cases & Security Hardening
  // =========================================================================
  describe('4. Prerenderer, Sitemap Edge Cases & CSP Hardening', () => {
    it('T5.4.1: sitemap.xml strictly excludes all planned tools while including all live tools and variants', () => {
      const sitemapPath = path.resolve(PROJECT_ROOT, 'public/sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);
      const sitemap = fs.readFileSync(sitemapPath, 'utf8');

      // Check planned tools exclusion
      const plannedTools = toolCatalogModule.TOOLS.filter((t) => t.status === 'planned');
      expect(plannedTools.length).toBeGreaterThan(0);
      for (const planned of plannedTools) {
        expect(sitemap).not.toContain(`/tools/${planned.slug}</loc>`);
      }

      // Check live tools inclusion
      for (const live of toolCatalogModule.LISTED_TOOLS) {
        expect(sitemap).toContain(`/tools/${live.slug}</loc>`);
      }

      // Check programmatic tool variants
      const variants = readProjectJson('src/data/toolVariants.json');
      expect(variants.length).toBe(28);
      for (const v of variants) {
        expect(sitemap).toContain(`/tools/${v.slug}</loc>`);
      }

      // Exact count verification (7 static + live tools + 28 variants)
      const urlCount = (sitemap.match(/<url>/g) || []).length;
      expect(urlCount).toBe(7 + toolCatalogModule.LISTED_TOOLS.length + variants.length);
    });

    it('T5.4.2: 404.html contains meta robots noindex tag and provides navigation to live tools', () => {
      const dist404 = path.resolve(PROJECT_ROOT, 'dist/404.html');
      const public404 = path.resolve(PROJECT_ROOT, 'public/404.html');

      if (!fs.existsSync(dist404)) return; // requires npm run build

      expect(fs.existsSync(dist404)).toBe(true);
      expect(fs.existsSync(public404)).toBe(true);

      const html = fs.readFileSync(dist404, 'utf8');
      expect(html).toContain('<meta name="robots" content="noindex, follow" />');
      expect(html).toContain('Page Not Found');
      expect(html).toContain('href="/tools"');
    });

    it('T5.4.3: vercel.json rewrites exclude /api/ and route unknown paths to SPA fallback', () => {
      const vercel = readProjectJson('vercel.json');
      expect(vercel.rewrites).toBeDefined();
      const apiExclusion = vercel.rewrites.find((r) => r.source.includes('(?!api/)'));
      expect(apiExclusion).toBeDefined();
      expect(apiExclusion.destination).toBe('/index.html');
    });

    it('T5.4.4: vercel.json CSP contains no unsafe-eval and script-src includes exact Consent Mode SHA-256 hash', () => {
      const vercel = readProjectJson('vercel.json');
      const cspHeader = vercel.headers
        .find((h) => h.source === '/(.*)')
        ?.headers.find((hdr) => hdr.key === 'Content-Security-Policy')?.value;

      expect(cspHeader).toBeDefined();
      // Must not contain unsafe-eval
      expect(cspHeader).not.toContain("'unsafe-eval'");
      // Must not contain unsafe-inline in script-src
      const scriptSrcPart = cspHeader.split(';').find((p) => p.trim().startsWith('script-src '));
      expect(scriptSrcPart).toBeDefined();
      expect(scriptSrcPart).not.toContain("'unsafe-inline'");

      // Verify inline consent script hash matches index.html
      const indexHtml = readProjectFile('index.html');
      const consentScriptMatch = indexHtml.match(/<!-- Google Consent Mode v2 Setup -->\s*<script>([\s\S]*?)<\/script>/);
      expect(consentScriptMatch).not.toBeNull();
      const computedHash = computeCspHash(consentScriptMatch[1]);
      expect(cspHeader).toContain(computedHash);
    });

    it('T5.4.5: programmatic variants generator caps at <= 150 variants with canonical tags pointing to base tools', () => {
      const variants = readProjectJson('src/data/toolVariants.json');
      expect(variants.length).toBeLessThanOrEqual(150);

      for (const v of variants) {
        expect(['emi', 'ctc-to-inhand']).toContain(v.baseToolSlug);
        expect(v.canonicalUrl).toBe(`https://orbitboard.in/tools/${v.baseToolSlug}`);
        expect(v.intro).toBeDefined();
        expect(v.faq.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // 5. Analytics Telemetry & Consent Mode v2 State Resilience
  // =========================================================================
  describe('5. Analytics Consent Mode & Funnel Telemetry Resilience', () => {
    beforeEach(() => {
      // Clear cookie storage
      window.localStorage?.clear();
      window.gtag = vi.fn();
    });

    it('T5.5.1: trackEvent returns false and suppresses all events when consent is denied or null', () => {
      // Consent not granted
      cookieConsentModule.setConsentStatus('denied');
      window.gtag.mockClear();

      expect(analyticsModule.trackToolUsed('payslip-generator')).toBe(false);
      expect(analyticsModule.trackInvoiceCreated('INV-001')).toBe(false);
      expect(analyticsModule.trackExportClicked('pdf')).toBe(false);
      expect(analyticsModule.trackPaywallViewed('advanced_exports')).toBe(false);
      expect(analyticsModule.trackCheckoutStarted('pro_monthly')).toBe(false);
      expect(analyticsModule.trackSubscriptionActive('pro_monthly')).toBe(false);
      expect(window.gtag).not.toHaveBeenCalled();
    });

    it('T5.5.2: trackEvent emits all 6 funnel events with correct parameters when consent is granted', () => {
      cookieConsentModule.setConsentStatus('granted');

      const events = [];
      window.gtag = vi.fn((type, name, params) => {
        if (type === 'event') events.push({ name, params });
      });

      expect(analyticsModule.trackToolUsed('tds-calculator')).toBe(true);
      expect(analyticsModule.trackInvoiceCreated('INV-2026-99')).toBe(true);
      expect(analyticsModule.trackExportClicked('xlsx')).toBe(true);
      expect(analyticsModule.trackPaywallViewed('bulk_processing')).toBe(true);
      expect(analyticsModule.trackCheckoutStarted('business_monthly')).toBe(true);
      expect(analyticsModule.trackSubscriptionActive('business_monthly')).toBe(true);

      expect(events).toHaveLength(6);
      expect(events[0]).toEqual({ name: 'tool_used', params: { slug: 'tds-calculator' } });
      expect(events[1]).toEqual({ name: 'invoice_created', params: { id: 'INV-2026-99' } });
      expect(events[2]).toEqual({ name: 'export_clicked', params: { format: 'xlsx' } });
      expect(events[3]).toEqual({ name: 'paywall_viewed', params: { feature: 'bulk_processing' } });
      expect(events[4]).toEqual({ name: 'checkout_started', params: { plan: 'business_monthly' } });
      expect(events[5]).toEqual({ name: 'subscription_active', params: { plan: 'business_monthly' } });
    });

    it('T5.5.3: loadGoogleAnalytics handles repeated invocations idempotently without duplicating script tag', async () => {
      // Pre-seed mock script tag so it resolves immediately without external network fetch
      const mockScript = document.createElement('script');
      mockScript.dataset.orbitboardGa = 'true';
      document.head.appendChild(mockScript);

      const p1 = analyticsModule.loadGoogleAnalytics();
      const p2 = analyticsModule.loadGoogleAnalytics();
      expect(p1).toBe(p2);
      await p1;
      const scripts = document.querySelectorAll('script[data-orbitboard-ga]');
      expect(scripts.length).toBe(1);
    });
  });
});
