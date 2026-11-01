import { describe, it, expect } from 'vitest';
import { calculateTds, isValidPan, TDS_CONFIG } from './tdsEngine.js';

describe('tdsEngine', () => {
  describe('PAN Validation', () => {
    it('validates 10-character alphanumeric Indian PAN format', () => {
      expect(isValidPan('ABCDE1234F')).toBe(true);
      expect(isValidPan('abcde1234f')).toBe(true);
      expect(isValidPan('ABCDE12345')).toBe(false); // 5 digits instead of 4
      expect(isValidPan('12345ABCDE')).toBe(false);
      expect(isValidPan('')).toBe(false);
      expect(isValidPan(null)).toBe(false);
    });
  });

  describe('Section 194A: Interest other than Securities', () => {
    it('applies 10% TDS above ₹40,000 general threshold', () => {
      const below = calculateTds({ section: '194A', amount: 35000, isSenior: false });
      expect(below.isExempt).toBe(true);
      expect(below.tdsAmount).toBe(0);

      const at = calculateTds({ section: '194A', amount: 40000, isSenior: false });
      expect(at.isExempt).toBe(true);
      expect(at.tdsAmount).toBe(0);

      const above = calculateTds({ section: '194A', amount: 60000, isSenior: false });
      expect(above.isExempt).toBe(false);
      expect(above.rate).toBe(0.10);
      expect(above.tdsAmount).toBe(6000);
      expect(above.netPayable).toBe(54000);
    });

    it('applies higher ₹50,000 threshold for Senior Citizens', () => {
      const at50k = calculateTds({ section: '194A', amount: 50000, isSenior: true });
      expect(at50k.isExempt).toBe(true);
      expect(at50k.tdsAmount).toBe(0);

      const above50k = calculateTds({ section: '194A', amount: 50001, isSenior: true });
      expect(above50k.isExempt).toBe(false);
      expect(above50k.tdsAmount).toBe(5000);
    });
  });

  describe('Section 194C: Contractors & Sub-contractors', () => {
    it('applies 1% for individuals and 2% for companies above ₹30,000 threshold', () => {
      const at30k = calculateTds({ section: '194C', amount: 30000 });
      expect(at30k.isExempt).toBe(true);

      const ind = calculateTds({ section: '194C', amount: 50000, recipientType: 'individual' });
      expect(ind.isExempt).toBe(false);
      expect(ind.rate).toBe(0.01);
      expect(ind.tdsAmount).toBe(500); // 1%

      const comp = calculateTds({ section: '194C', amount: 50000, recipientType: 'company' });
      expect(comp.isExempt).toBe(false);
      expect(comp.rate).toBe(0.02);
      expect(comp.tdsAmount).toBe(1000); // 2%
    });
  });

  describe('Section 194H: Commission & Brokerage', () => {
    it('applies 5% TDS above ₹15,000 threshold', () => {
      const below = calculateTds({ section: '194H', amount: 15000 });
      expect(below.isExempt).toBe(true);

      const above = calculateTds({ section: '194H', amount: 20000 });
      expect(above.isExempt).toBe(false);
      expect(above.rate).toBe(0.05);
      expect(above.tdsAmount).toBe(1000); // 5%
    });
  });

  describe('Section 194I: Rent on Property & Machinery', () => {
    it('applies 2% on plant/machinery and 10% on land/building above ₹2,40,000 threshold', () => {
      const at240k = calculateTds({ section: '194I', amount: 240000, subType: 'building' });
      expect(at240k.isExempt).toBe(true);

      const machinery = calculateTds({ section: '194I', amount: 300000, subType: 'machinery' });
      expect(machinery.rate).toBe(0.02);
      expect(machinery.tdsAmount).toBe(6000); // 2% of 300,000

      const building = calculateTds({ section: '194I', amount: 300000, subType: 'building' });
      expect(building.rate).toBe(0.10);
      expect(building.tdsAmount).toBe(30000); // 10% of 300,000
    });
  });

  describe('Section 194J: Professional & Technical Fees', () => {
    it('applies 2% on technical fees and 10% on professional services above ₹30,000 threshold', () => {
      const tech = calculateTds({ section: '194J', amount: 50000, subType: 'technical' });
      expect(tech.rate).toBe(0.02);
      expect(tech.tdsAmount).toBe(1000); // 2%

      const prof = calculateTds({ section: '194J', amount: 150000, subType: 'professional' });
      expect(prof.rate).toBe(0.10);
      expect(prof.tdsAmount).toBe(15000); // 10%
    });
  });

  describe('Section 192: Salary TDS', () => {
    it('computes salary TDS based on progressive tax slabs', () => {
      const lowSalary = calculateTds({ section: '192', amount: 1000000, regime: 'new' });
      expect(lowSalary.tdsAmount).toBe(0); // 87A rebate

      const highSalary = calculateTds({ section: '192', amount: 2000000, regime: 'new' });
      expect(highSalary.tdsAmount).toBeGreaterThan(0);
    });
  });

  describe('Section 206AA: Higher Penal Rate on Missing PAN', () => {
    it('mandates 20% flat rate when panProvided is false or invalid PAN is passed', () => {
      const noPan = calculateTds({ section: '194C', amount: 50000, panProvided: false });
      expect(noPan.rate).toBe(0.20);
      expect(noPan.tdsAmount).toBe(10000); // 20% on 50,000
      expect(noPan.reason).toContain('Section 206AA');
      const badPan = calculateTds({ section: '194J', amount: 40000, pan: 'INVALID', panProvided: true });
      expect(badPan.rate).toBe(0.20);
      expect(badPan.tdsAmount).toBe(8000);
      expect(badPan.isPenal).toBe(true);
    });
  });

  describe('Table-Driven Configuration Integrity', () => {
    it('defines configurations for all required statutory sections', () => {
      expect(TDS_CONFIG['192']).toBeDefined();
      expect(TDS_CONFIG['194A']).toBeDefined();
      expect(TDS_CONFIG['194C']).toBeDefined();
      expect(TDS_CONFIG['194H']).toBeDefined();
      expect(TDS_CONFIG['194I']).toBeDefined();
      expect(TDS_CONFIG['194J']).toBeDefined();
    });
  });
});
