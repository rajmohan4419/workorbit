// scripts/generate-tool-variants.ts
// Programmatically generates parameterized variants for EMI and CTC-to-In-Hand calculators.
// Output: src/data/toolVariants.json (capped <= 150 pages)

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface EmiParams {
  principal: number;
  tenureYears: number;
  interestRate: number;
}

export interface CtcParams {
  ctcAnnual: number;
  regime: 'new' | 'old';
  basicPct?: number;
}

export interface ToolVariant {
  slug: string;
  baseToolSlug: 'emi' | 'ctc-to-inhand';
  name: string;
  category: 'Finance' | 'Career';
  description: string;
  params: EmiParams | CtcParams;
  intro: string;
  faq: [string, string][];
  canonicalUrl: string;
  computed: Record<string, number | string>;
}

// Format numbers in Indian numbering format (e.g. 50,00,000)
function formatINR(n: number, decimals: number = 0): string {
  return Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function calculateEmi(principal: number, interestRateAnnual: number, tenureYears: number) {
  const p = principal;
  const r = interestRateAnnual / 1200;
  const n = tenureYears * 12;
  const emi = r > 0 ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : p / n;
  const roundedEmi = Math.round(emi);
  const totalRepayment = roundedEmi * n;
  const totalInterest = totalRepayment - p;
  return {
    monthlyEmi: roundedEmi,
    totalInterest,
    totalRepayment,
    tenureMonths: n,
  };
}

function calculateNewTax(taxable: number): number {
  const slabs: [number, number][] = [
    [400000, 0],
    [400000, 0.05],
    [400000, 0.10],
    [400000, 0.15],
    [400000, 0.20],
    [400000, 0.25],
    [Infinity, 0.30],
  ];
  let remaining = taxable;
  let tax = 0;
  for (const [limit, rate] of slabs) {
    const amount = Math.min(remaining, limit);
    if (amount <= 0) break;
    tax += amount * rate;
    remaining -= amount;
  }
  if (taxable <= 1200000) {
    tax = Math.max(0, tax - 60000);
  }
  return tax * 1.04;
}

function calculateOldTax(taxable: number): number {
  const slabs: [number, number][] = [
    [250000, 0],
    [250000, 0.05],
    [500000, 0.20],
    [Infinity, 0.30],
  ];
  let remaining = taxable;
  let tax = 0;
  for (const [limit, rate] of slabs) {
    const amount = Math.min(remaining, limit);
    if (amount <= 0) break;
    tax += amount * rate;
    remaining -= amount;
  }
  if (taxable <= 500000) {
    tax = Math.max(0, tax - 12500);
  }
  return tax * 1.04;
}

function calculateCtcToInHand(annualCtc: number, regime: 'new' | 'old', basicPct: number = 40) {
  const basic = (annualCtc * basicPct) / 100;
  const monthlyBasic = basic / 12;
  // Standard statutory EPF wage ceiling calculation (capped at 15,000 monthly basic)
  const employeePf = Math.min(monthlyBasic, 15000) * 0.12 * 12;
  const employerPf = employeePf;
  const grossCash = Math.max(0, annualCtc - employerPf);
  const fixedGross = grossCash;
  const standardDeduction = regime === 'new' ? 75000 : 50000;
  const taxable = Math.max(0, fixedGross - standardDeduction);
  const incomeTax = regime === 'new' ? calculateNewTax(taxable) : calculateOldTax(taxable);
  const pt = fixedGross / 12 >= 25000 ? 2500 : 0;
  const annualTakeHome = Math.max(0, fixedGross - employeePf - incomeTax - pt);
  const monthlyTakeHome = Math.round(annualTakeHome / 12);

  return {
    annualCtc,
    basicAnnual: Math.round(basic),
    employeePf: Math.round(employeePf),
    standardDeduction,
    taxableIncome: Math.round(taxable),
    incomeTax: Math.round(incomeTax),
    professionalTax: pt,
    annualTakeHome: Math.round(annualTakeHome),
    monthlyTakeHome,
  };
}

export function generateVariants(): ToolVariant[] {
  const variants: ToolVariant[] = [];

  // 1. EMI Variants: 4 Amounts x 4 Tenures = 16 Variants
  const emiAmounts = [
    { value: 1000000, label: '10 Lakh', display: '₹10 Lakh', slugPart: '10-lakh' },
    { value: 2500000, label: '25 Lakh', display: '₹25 Lakh', slugPart: '25-lakh' },
    { value: 5000000, label: '50 Lakh', display: '₹50 Lakh', slugPart: '50-lakh' },
    { value: 10000000, label: '1 Crore', display: '₹1 Crore', slugPart: '1-crore' },
  ];

  const emiTenures = [
    { years: 10, label: '10 Years', slugPart: '10-years' },
    { years: 15, label: '15 Years', slugPart: '15-years' },
    { years: 20, label: '20 Years', slugPart: '20-years' },
    { years: 25, label: '25 Years', slugPart: '25-years' },
  ];

  const benchmarkRate = 8.5; // 8.5% standard Indian home loan benchmark

  for (const amt of emiAmounts) {
    for (const tenure of emiTenures) {
      const calc = calculateEmi(amt.value, benchmarkRate, tenure.years);
      const slug = `emi-calculator-${amt.slugPart}-${tenure.slugPart}`;
      const name = `${amt.display} Loan EMI Calculator (${tenure.label})`;
      const desc = `Calculate exact monthly EMI for ${amt.display} at ${benchmarkRate}% for ${tenure.years} years. Monthly EMI is ₹${formatINR(calc.monthlyEmi)}, total interest ₹${formatINR(calc.totalInterest)}.`;
      const intro = `For a loan principal of ${amt.display} at an interest rate of ${benchmarkRate}% per annum over a tenure of ${tenure.years} years (${calc.tenureMonths} months), your monthly EMI is ₹${formatINR(calc.monthlyEmi)}. Over the entire loan term, you will pay a total interest of ₹${formatINR(calc.totalInterest)}, bringing the cumulative repayment to ₹${formatINR(calc.totalRepayment)}.`;

      const faq: [string, string][] = [
        [
          `What is the monthly EMI for a ${amt.display} loan for ${tenure.years} years at ${benchmarkRate}%?`,
          `The monthly EMI for a principal of ${amt.display} at ${benchmarkRate}% annual interest rate over a ${tenure.years}-year term is ₹${formatINR(calc.monthlyEmi)} per month.`
        ],
        [
          `How much total interest will I pay on a ${amt.display} loan over ${tenure.years} years?`,
          `Over ${tenure.years} years (${calc.tenureMonths} monthly installments), the total interest payable is ₹${formatINR(calc.totalInterest)}, which represents ${((calc.totalInterest / amt.value) * 100).toFixed(1)}% of your principal.`
        ],
        [
          `What is the total repayment amount for ${amt.display} over ${tenure.years} years?`,
          `The total repayment amount is ₹${formatINR(calc.totalRepayment)}, which includes the original principal of ${amt.display} plus total interest of ₹${formatINR(calc.totalInterest)}.`
        ],
        [
          `Can I prepay or foreclose this ${amt.display} home loan early?`,
          `Yes. Under RBI guidelines, floating-rate home loans sanctioned to individual borrowers have 0 foreclosure or prepayment penalties. Prepaying even ₹5,000–₹10,000 extra per year significantly reduces total interest.`
        ]
      ];

      variants.push({
        slug,
        baseToolSlug: 'emi',
        name,
        category: 'Finance',
        description: desc,
        params: {
          principal: amt.value,
          tenureYears: tenure.years,
          interestRate: benchmarkRate,
        },
        intro,
        faq,
        canonicalUrl: 'https://orbitboard.in/tools/emi',
        computed: {
          monthlyEmi: calc.monthlyEmi,
          totalInterest: calc.totalInterest,
          totalRepayment: calc.totalRepayment,
          tenureMonths: calc.tenureMonths,
        },
      });
    }
  }

  // 2. CTC-to-In-Hand Variants: 6 CTCs x 2 Regimes = 12 Variants
  const ctcLevels = [
    { value: 600000, label: '6 LPA', display: '₹6 LPA', slugPart: '6-lpa' },
    { value: 800000, label: '8 LPA', display: '₹8 LPA', slugPart: '8-lpa' },
    { value: 1000000, label: '10 LPA', display: '₹10 LPA', slugPart: '10-lpa' },
    { value: 1200000, label: '12 LPA', display: '₹12 LPA', slugPart: '12-lpa' },
    { value: 1500000, label: '15 LPA', display: '₹15 LPA', slugPart: '15-lpa' },
    { value: 2000000, label: '20 LPA', display: '₹20 LPA', slugPart: '20-lpa' },
  ];

  const taxRegimes: Array<{ regime: 'new' | 'old'; label: string; slugPart: string }> = [
    { regime: 'new', label: 'New Tax Regime', slugPart: 'new-regime' },
    { regime: 'old', label: 'Old Tax Regime', slugPart: 'old-regime' },
  ];

  for (const ctc of ctcLevels) {
    for (const reg of taxRegimes) {
      const calc = calculateCtcToInHand(ctc.value, reg.regime);
      const slug = `ctc-to-in-hand-${ctc.slugPart}-${reg.slugPart}`;
      const name = `${ctc.display} Salary In-Hand Calculator (${reg.label})`;
      const desc = `Detailed monthly in-hand take-home salary breakdown for ${ctc.display} CTC under the ${reg.label}. Estimated in-hand pay: ₹${formatINR(calc.monthlyTakeHome)}/month after taxes and PF.`;
      const intro = `For an annual CTC package of ${ctc.display} under the ${reg.label}, your estimated monthly take-home salary is ₹${formatINR(calc.monthlyTakeHome)}. This breakdown accounts for employee EPF contribution of ₹${formatINR(calc.employeePf)}/year, statutory standard deduction of ₹${formatINR(calc.standardDeduction)}, and annual income tax of ₹${formatINR(calc.incomeTax)}.`;

      const faq: [string, string][] = [
        [
          `What is the monthly in-hand salary for ${ctc.display} CTC under ${reg.label}?`,
          `Under ${reg.label}, an annual CTC of ${ctc.display} yields an estimated in-hand take-home salary of approximately ₹${formatINR(calc.monthlyTakeHome)} per month (₹${formatINR(calc.annualTakeHome)} annually).`
        ],
        [
          `How much income tax is deducted for ${ctc.display} under ${reg.label}?`,
          calc.incomeTax === 0
            ? `Under the ${reg.label}, your total income tax liability is ₹0 thanks to tax rebate provisions on taxable income up to eligible rebate thresholds.`
            : `Under the ${reg.label}, your calculated annual income tax liability is approximately ₹${formatINR(calc.incomeTax)} (including 4% health and education cess) after the standard deduction of ₹${formatINR(calc.standardDeduction)}.`
        ],
        [
          `How much EPF is deducted monthly from a ${ctc.display} salary package?`,
          `Assuming standard statutory PF capping on Basic pay (capped at ₹15,000 monthly basic wage), the monthly employee PF deduction is ₹${formatINR(Math.round(calc.employeePf / 12))}, totaling ₹${formatINR(calc.employeePf)} annually.`
        ],
        [
          `Is ${reg.label} better for ${ctc.display} CTC?`,
          reg.regime === 'new'
            ? `For ${ctc.display} CTC, the New Tax Regime is generally advantageous for salaried professionals who do not have extensive chapter VI-A deductions (HRA, 80C, 80D), offering lower tax slab rates and a ₹75,000 standard deduction.`
            : `The Old Tax Regime may be beneficial for ${ctc.display} CTC only if you can claim significant tax exemptions like Section 80C (₹1.5 Lakh), Section 80D health insurance, home loan interest (Section 24b), and substantial House Rent Allowance (HRA).`
        ]
      ];

      variants.push({
        slug,
        baseToolSlug: 'ctc-to-inhand',
        name,
        category: 'Career',
        description: desc,
        params: {
          ctcAnnual: ctc.value,
          regime: reg.regime,
          basicPct: 40,
        },
        intro,
        faq,
        canonicalUrl: 'https://orbitboard.in/tools/ctc-to-inhand',
        computed: {
          annualCtc: calc.annualCtc,
          annualTakeHome: calc.annualTakeHome,
          monthlyTakeHome: calc.monthlyTakeHome,
          incomeTax: calc.incomeTax,
          employeePf: calc.employeePf,
          standardDeduction: calc.standardDeduction,
        },
      });
    }
  }

  return variants;
}

async function main() {
  const variants = generateVariants();
  const targetDir = path.resolve(process.cwd(), 'src/data');
  await mkdir(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, 'toolVariants.json');
  await writeFile(targetFile, JSON.stringify(variants, null, 2), 'utf8');
  console.log(`Successfully generated ${variants.length} tool variants to ${targetFile}`);
}

// Only execute main when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Failed to generate tool variants:', err);
    process.exit(1);
  });
}
