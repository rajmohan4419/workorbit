// src/data/toolVariants.test.js
import { describe, it, expect } from 'vitest';
import toolVariants from './toolVariants.json';

describe('Tool Variants Data & Calculations Suite', () => {
  it('contains exactly 28 variants within the <= 150 cap', () => {
    expect(toolVariants.length).toBe(28);
    expect(toolVariants.length).toBeLessThanOrEqual(150);
  });

  it('contains 16 EMI variants and 12 CTC variants', () => {
    const emiVariants = toolVariants.filter((v) => v.baseToolSlug === 'emi');
    const ctcVariants = toolVariants.filter((v) => v.baseToolSlug === 'ctc-to-inhand');

    expect(emiVariants.length).toBe(16);
    expect(ctcVariants.length).toBe(12);
    expect(emiVariants.length + ctcVariants.length).toBe(28);
  });

  it('validates structure and schema of every variant entry', () => {
    const slugs = new Set();

    for (const v of toolVariants) {
      expect(v.slug).toBeTruthy();
      expect(slugs.has(v.slug), `Duplicate slug detected: ${v.slug}`).toBe(false);
      slugs.add(v.slug);

      expect(['emi', 'ctc-to-inhand']).toContain(v.baseToolSlug);
      expect(['Finance', 'Career']).toContain(v.category);
      expect(v.name).toBeTruthy();
      expect(v.description).toBeTruthy();
      expect(v.intro).toBeTruthy();
      expect(v.params).toBeTypeOf('object');
      expect(v.computed).toBeTypeOf('object');

      // FAQ validation: minimum 3-4 Q&A pairs
      expect(Array.isArray(v.faq)).toBe(true);
      expect(v.faq.length).toBeGreaterThanOrEqual(3);
      for (const [q, a] of v.faq) {
        expect(typeof q).toBe('string');
        expect(typeof a).toBe('string');
        expect(q.length).toBeGreaterThan(10);
        expect(a.length).toBeGreaterThan(15);
      }

      // Canonical URL points to base tool
      if (v.baseToolSlug === 'emi') {
        expect(v.canonicalUrl).toBe('https://orbitboard.in/tools/emi');
      } else if (v.baseToolSlug === 'ctc-to-inhand') {
        expect(v.canonicalUrl).toBe('https://orbitboard.in/tools/ctc-to-inhand');
      }
    }
  });

  it('verifies genuine calculation accuracy for EMI variants', () => {
    const v50L20Y = toolVariants.find((v) => v.slug === 'emi-calculator-50-lakh-20-years');
    expect(v50L20Y).toBeDefined();
    expect(v50L20Y.params.principal).toBe(5000000);
    expect(v50L20Y.params.tenureYears).toBe(20);
    expect(v50L20Y.params.interestRate).toBe(8.5);

    // Standard formula: P = 50,00,000, r = 8.5/1200, n = 240
    // EMI is 43,391
    expect(v50L20Y.computed.monthlyEmi).toBe(43391);
    expect(v50L20Y.computed.totalRepayment).toBe(43391 * 240);
    expect(v50L20Y.computed.totalInterest).toBe(43391 * 240 - 5000000);
    expect(v50L20Y.intro).toContain('₹43,391');
  });

  it('verifies genuine calculation accuracy for CTC-to-in-hand variants', () => {
    const v12LNew = toolVariants.find((v) => v.slug === 'ctc-to-in-hand-12-lpa-new-regime');
    expect(v12LNew).toBeDefined();
    expect(v12LNew.params.ctcAnnual).toBe(1200000);
    expect(v12LNew.params.regime).toBe('new');

    // Basic: 40% of 12L = 4,80,000 (monthly 40,000)
    // Capped PF: min(40000, 15000) * 0.12 * 12 = 21,600
    // Standard deduction: 75,000
    // Income tax under new regime with rebate: 0 (since taxable <= 12L rebate)
    expect(v12LNew.computed.employeePf).toBe(21600);
    expect(v12LNew.computed.standardDeduction).toBe(75000);
    expect(v12LNew.computed.incomeTax).toBe(0);
    expect(v12LNew.computed.annualTakeHome).toBe(1200000 - 21600 - 21600 - 0 - 2500); // 11,54,300
    expect(v12LNew.computed.monthlyTakeHome).toBe(Math.round(1154300 / 12)); // 96,192
  });
});
