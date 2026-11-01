import { describe, it, expect } from 'vitest';
import { calculatePfEsi, PF_STATUTORY_CONFIG, ESI_STATUTORY_CONFIG } from './pfEsiEngine.js';

describe('pfEsiEngine', () => {
  describe('EPF Statutory Contributions & Ceilings', () => {
    it('caps employee PF contribution at ₹1,800 for basic salary >= ₹15,000', () => {
      const at15k = calculatePfEsi({ basicSalary: 15000, capPf: true });
      expect(at15k.employeePf).toBe(1800);

      const at50k = calculatePfEsi({ basicSalary: 50000, capPf: true });
      expect(at50k.employeePf).toBe(1800);
    });

    it('calculates uncapped 12% employee contribution when capPf is false', () => {
      const uncapped50k = calculatePfEsi({ basicSalary: 50000, capPf: false });
      expect(uncapped50k.employeePf).toBe(6000); // 50,000 * 12%
    });

    it('calculates below-ceiling basic salary proportionally (12%)', () => {
      const below10k = calculatePfEsi({ basicSalary: 10000 });
      expect(below10k.employeePf).toBe(1200); // 10,000 * 12%
    });

    it('apportions employer share between EPS (capped at ₹1,250) and EPF', () => {
      const res = calculatePfEsi({ basicSalary: 15000, capPf: true });
      expect(res.employerEps).toBe(1250); // 8.33% of 15,000 = capped at 1,250
      expect(res.employerEpf).toBe(550); // 1,800 - 1,250 = 550 (3.67%)
      expect(res.employerEps + res.employerEpf).toBe(1800);
    });

    it('calculates EDLI contribution at 0.5% capped at ₹75', () => {
      const res15k = calculatePfEsi({ basicSalary: 15000 });
      expect(res15k.employerEdli).toBe(75);

      const res10k = calculatePfEsi({ basicSalary: 10000 });
      expect(res10k.employerEdli).toBe(50); // 0.5% of 10,000
    });
  });

  describe('ESI Statutory Contributions & Ceilings', () => {
    it('calculates ESI at 0.75% employee and 3.25% employer when gross <= ₹21,000', () => {
      const eligible = calculatePfEsi({ basicSalary: 10000, grossSalary: 20000 });
      expect(eligible.isEsiEligible).toBe(true);
      expect(eligible.employeeEsi).toBe(150); // 20,000 * 0.75%
      expect(eligible.employerEsi).toBe(650); // 20,000 * 3.25%
      expect(eligible.totalEsiRemittance).toBe(800); // 4%
    });

    it('exempts wages exceeding ₹21,000 statutory ceiling', () => {
      const at21k = calculatePfEsi({ basicSalary: 10000, grossSalary: 21000 });
      expect(at21k.isEsiEligible).toBe(true);
      expect(at21k.employeeEsi).toBe(Math.round(21000 * 0.0075));

      const above21k = calculatePfEsi({ basicSalary: 10000, grossSalary: 21001 });
      expect(above21k.isEsiEligible).toBe(false);
      expect(above21k.employeeEsi).toBe(0);
      expect(above21k.employerEsi).toBe(0);
    });

    it('supports higher ₹25,000 ceiling for employees with disabilities', () => {
      const disEligible = calculatePfEsi({ basicSalary: 10000, grossSalary: 25000, hasDisability: true });
      expect(disEligible.isEsiEligible).toBe(true);
      expect(disEligible.employeeEsi).toBe(Math.round(25000 * 0.0075));

      const disExempt = calculatePfEsi({ basicSalary: 10000, grossSalary: 25001, hasDisability: true });
      expect(disExempt.isEsiEligible).toBe(false);
      expect(disExempt.employeeEsi).toBe(0);
    });
  });

  describe('Zero and Boundary Handling', () => {
    it('clamps zero and negative salaries to zero', () => {
      const zero = calculatePfEsi({ basicSalary: 0, grossSalary: 0 });
      expect(zero.employeePf).toBe(0);
      expect(zero.employeeEsi).toBe(0);
      expect(zero.totalStatutoryRemittance).toBe(0);

      const negative = calculatePfEsi({ basicSalary: -5000, grossSalary: -10000 });
      expect(negative.employeePf).toBe(0);
      expect(negative.employeeEsi).toBe(0);
    });
  });

  describe('Table-Driven Configuration Integrity', () => {
    it('exposes statutory configuration ceilings', () => {
      expect(ESI_STATUTORY_CONFIG.statutoryWageCeilingMonthly).toBe(21000);
      expect(ESI_STATUTORY_CONFIG.disabilityWageCeilingMonthly).toBe(25000);
      expect(PF_STATUTORY_CONFIG.wageCeilingMonthly).toBe(15000);
    });

    it('respects custom configuration ceilings dynamically without hardcoding', () => {
      const customPfConfig = {
        ...PF_STATUTORY_CONFIG,
        wageCeilingMonthly: 25000,
        maxCappedEmployeeMonthly: 3000,
        maxCappedEpsMonthly: 2083,
      };
      const res = calculatePfEsi({ basicSalary: 25000, pfConfig: customPfConfig });
      expect(res.employeePf).toBe(3000);
      expect(res.employerEps).toBe(2083);
    });
  });
});
