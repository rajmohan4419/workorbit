import { describe, it, expect } from 'vitest';
import { generateSalarySheet, SAMPLE_TEAM } from './salarySheetEngine.js';

describe('salarySheetEngine', () => {
  describe('Attendance Proration & Computations', () => {
    const team = [
      { id: 'E001', name: 'Alice Smith', monthlyGross: 60000, paidDays: 30 },
      { id: 'E002', name: 'Bob Jones', monthlyGross: 60000, paidDays: 15 },
    ];

    it('prorates monthly gross salary proportionally by paid days over calendar days', () => {
      const sheet = generateSalarySheet({ employees: team, daysInMonth: 30 });
      expect(sheet.rows[0].proratedGross).toBe(60000); // 30/30
      expect(sheet.rows[1].proratedGross).toBe(30000); // 15/30
    });

    it('calculates PF deduction on prorated basic wage for each employee', () => {
      const sheet = generateSalarySheet({ employees: team, daysInMonth: 30 });
      expect(sheet.rows[0].pf).toBe(1800);
      expect(sheet.rows[1].pf).toBe(1440); // 30,000 * 0.40 = 12,000 basic * 12% = 1440
    });

    it('deducts state professional tax on prorated earnings exceeding threshold', () => {
      const sheet = generateSalarySheet({ employees: team, daysInMonth: 30 });
      expect(sheet.rows[0].pt).toBe(200); // 60,000 >= 25,000
      expect(sheet.rows[1].pt).toBe(200); // 30,000 >= 25,000
    });

    it('computes accurate net salary for each employee as prorated gross minus deductions', () => {
      const sheet = generateSalarySheet({ employees: team, daysInMonth: 30 });
      for (const row of sheet.rows) {
        expect(row.netSalary).toBe(row.proratedGross - row.totalDeductions);
      }
    });

    it('aggregates team totals for gross payout, total deductions, and net disbursed amount', () => {
      const sheet = generateSalarySheet({ employees: team, daysInMonth: 30 });
      expect(sheet.totalGross).toBe(90000); // 60k + 30k
      expect(sheet.totalDeductions).toBe(sheet.rows[0].totalDeductions + sheet.rows[1].totalDeductions);
      expect(sheet.totalNet).toBe(sheet.totalGross - sheet.totalDeductions);
    });
  });

  describe('Boundary & Corner Cases', () => {
    it('results in ₹0 gross and ₹0 net pay with no negative balance when paidDays is 0', () => {
      const employees = [{ id: 'E1', name: 'Absentee', monthlyGross: 50000, paidDays: 0 }];
      const sheet = generateSalarySheet({ employees, daysInMonth: 30 });
      expect(sheet.rows[0].proratedGross).toBe(0);
      expect(sheet.rows[0].netSalary).toBe(0);
      expect(sheet.rows[0].totalDeductions).toBe(0);
    });

    it('clamps over-attendance input (paidDays > daysInMonth) to daysInMonth', () => {
      const employees = [{ id: 'E1', name: 'OverWorker', monthlyGross: 50000, paidDays: 35 }];
      const sheet = generateSalarySheet({ employees, daysInMonth: 30 });
      expect(sheet.rows[0].paidDays).toBe(30);
      expect(sheet.rows[0].proratedGross).toBe(50000);
    });

    it('calculates fractional paid days (e.g. 15.5 days) without precision distortion', () => {
      const employees = [{ id: 'E1', name: 'HalfDay', monthlyGross: 60000, paidDays: 15.5 }];
      const sheet = generateSalarySheet({ employees, daysInMonth: 30 });
      expect(sheet.rows[0].proratedGross).toBe(31000); // 60000 * (15.5 / 30) = 31000
    });

    it('calculates exact proration for February leap year (29 days) vs non-leap year (28 days)', () => {
      const employees = [{ id: 'E1', name: 'FebEmp', monthlyGross: 56000, paidDays: 14 }];
      const leapSheet = generateSalarySheet({ employees, daysInMonth: 29 });
      const nonLeapSheet = generateSalarySheet({ employees, daysInMonth: 28 });

      expect(leapSheet.rows[0].proratedGross).toBe(Math.round(56000 * (14 / 29)));
      expect(nonLeapSheet.rows[0].proratedGross).toBe(28000); // 56000 * (14 / 28)
    });

    it('handles empty team roster safely with zero totals without crashing', () => {
      const sheet = generateSalarySheet({ employees: [], daysInMonth: 30 });
      expect(sheet.rows.length).toBe(0);
      expect(sheet.totalGross).toBe(0);
      expect(sheet.totalNet).toBe(0);
      expect(sheet.totalDeductions).toBe(0);
    });
  });

  describe('Realistic Sample Team', () => {
    it('correctly processes built-in sample team roster', () => {
      const sheet = generateSalarySheet({ employees: SAMPLE_TEAM, daysInMonth: 30 });
      expect(sheet.employeeCount).toBe(4);
      expect(sheet.totalGross).toBeGreaterThan(0);
      expect(sheet.totalNet).toBeGreaterThan(0);
      expect(sheet.formattedTotalNet).toContain('₹');
    });
  });
});
