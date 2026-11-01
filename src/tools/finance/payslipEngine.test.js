import { describe, it, expect } from 'vitest';
import { calculatePayslip, calculateTaxSlabs, amountToWords, STATUTORY_LIMITS } from './payslipEngine.js';

describe('payslipEngine', () => {
  describe('Tax Slabs & Rebates', () => {
    it('calculates 0 tax for taxable income up to 12 Lakh under New Regime due to 87A rebate', () => {
      expect(calculateTaxSlabs(1200000, 'new')).toBe(0);
      expect(calculateTaxSlabs(1000000, 'new')).toBe(0);
    });

    it('calculates progressive tax for income above 12 Lakh under New Regime with 4% cess', () => {
      // 15L taxable:
      // 0-4L: 0
      // 4-8L: 400000 * 5% = 20000
      // 8-12L: 400000 * 10% = 40000
      // 12-15L: 300000 * 15% = 45000
      // Total = 105000 * 1.04 = 109200
      expect(calculateTaxSlabs(1500000, 'new')).toBe(109200);
    });

    it('calculates tax under Old Regime with 87A rebate up to 5 Lakh', () => {
      expect(calculateTaxSlabs(500000, 'old')).toBe(0);
      // 6L taxable:
      // 0-2.5L: 0
      // 2.5-5L: 250000 * 5% = 12500
      // 5-6L: 100000 * 20% = 20000
      // Total = 32500 * 1.04 = 33800
      expect(calculateTaxSlabs(600000, 'old')).toBe(33800);
    });
  });

  describe('Salary Structure & Components', () => {
    it('allocates 40% Basic and 50% HRA correctly', () => {
      const res = calculatePayslip({ annualCtc: 1200000, basicPct: 40, hraPct: 50 });
      expect(res.basic).toBe(40000); // 12L * 40% / 12 = 40k
      expect(res.hra).toBe(20000); // 40k * 50% = 20k
      expect(res.monthlyGross).toBeGreaterThan(0);
    });

    it('caps employee PF contribution at ₹1,800 when capPf is true', () => {
      const resCapped = calculatePayslip({ annualCtc: 1200000, capPf: true });
      expect(resCapped.employeePf).toBe(1800);

      const resUncapped = calculatePayslip({ annualCtc: 1200000, capPf: false });
      expect(resUncapped.employeePf).toBe(4800); // 40k basic * 12%
    });

    it('calculates ESI only when gross wage is <= ₹21,000', () => {
      const lowSalary = calculatePayslip({ annualCtc: 240000 }); // ~20,000/mo
      expect(lowSalary.employeeEsi).toBeGreaterThan(0);
      expect(lowSalary.employeeEsi).toBe(Math.round(lowSalary.monthlyGross * STATUTORY_LIMITS.ESI.employeeRate));

      const highSalary = calculatePayslip({ annualCtc: 1200000 }); // ~100,000/mo
      expect(highSalary.employeeEsi).toBe(0);
    });

    it('supports disability ESI ceiling of ₹25,000', () => {
      const salary24k = calculatePayslip({ fixedMonthlyGross: 24000, hasDisability: true });
      expect(salary24k.employeeEsi).toBeGreaterThan(0);

      const salary26k = calculatePayslip({ fixedMonthlyGross: 26000, hasDisability: true });
      expect(salary26k.employeeEsi).toBe(0);
    });

    it('applies Karnataka professional tax of ₹200 for gross >= ₹25,000', () => {
      const high = calculatePayslip({ fixedMonthlyGross: 25000, state: 'Karnataka' });
      expect(high.professionalTax).toBe(200);

      const low = calculatePayslip({ fixedMonthlyGross: 24999, state: 'Karnataka' });
      expect(low.professionalTax).toBe(0);
    });

    it('prorates gross, basic, and deductions by attendance days', () => {
      const res = calculatePayslip({ fixedMonthlyGross: 60000, daysInMonth: 30, paidDays: 15 });
      expect(res.monthlyGross).toBe(30000); // 60k * (15/30)
      expect(res.paidDays).toBe(15);
      expect(res.lopDays).toBe(15);
      expect(res.netSalary).toBe(res.monthlyGross - res.totalDeductions);
    });
  });

  describe('Indian Number Formatting & Words', () => {
    it('formats net salary and currency outputs with Indian numbering', () => {
      const res = calculatePayslip({ annualCtc: 1200000 });
      expect(res.formattedNetSalary).toMatch(/^[\d,]+$/);
      expect(res.formattedGross).toContain('₹');
      expect(res.formattedNetSalary).not.toContain('NaN');
    });

    it('converts net salary into Indian English words', () => {
      expect(amountToWords(54321)).toBe('Rupees Fifty Four Thousand Three Hundred Twenty One Only');
      expect(amountToWords(100000)).toBe('Rupees One Lakh Only');
      expect(amountToWords(15000000)).toBe('Rupees One Crore Fifty Lakh Only');
      expect(amountToWords(0)).toBe('Rupees Zero Only');
    });

    it('handles zero and negative boundary conditions safely', () => {
      const zero = calculatePayslip({ annualCtc: 0 });
      expect(zero.monthlyGross).toBe(0);
      expect(zero.netSalary).toBe(0);
      expect(zero.employeePf).toBe(0);
      expect(zero.employeeEsi).toBe(0);

      const negative = calculatePayslip({ annualCtc: -100000 });
      expect(negative.monthlyGross).toBe(0);
      expect(negative.netSalary).toBe(0);
    });
  });
});
