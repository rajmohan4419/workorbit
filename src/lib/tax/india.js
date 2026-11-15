// Verified 2026-11-15. Ordinary-rate income only; no special-rate income.
export const TAX_VERIFIED_ON = '2026-11-15';
const currentSlabs = [[400000,0],[400000,.05],[400000,.10],[400000,.15],[400000,.20],[400000,.25],[Infinity,.30]];
export const INDIA_TAX_PERIODS = {
  'ay2025-26': { label:'AY 2025-26 (income FY 2024-25)', effectiveFrom:'2024-04-01', effectiveTo:'2025-03-31', act:1961, rebateSection:'87A', newSlabs:[[300000,0],[400000,.05],[300000,.10],[200000,.15],[300000,.20],[Infinity,.30]], rebateLimit:700000, rebateMax:25000, source:'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-3' },
  'ay2026-27': { label:'AY 2026-27 (income FY 2025-26)', effectiveFrom:'2025-04-01', effectiveTo:'2026-03-31', act:1961, rebateSection:'87A', newSlabs:currentSlabs, rebateLimit:1200000, rebateMax:60000, source:'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1' },
  'ty2026-27': { label:'Tax Year 2026-27 (income FY 2026-27)', effectiveFrom:'2026-04-01', effectiveTo:'2027-03-31', act:2025, rebateSection:'156', newSlabs:currentSlabs, rebateLimit:1200000, rebateMax:60000, source:'https://wmstatic-prd.incometaxindia.gov.in/web/guest/w/section-202-78' },
};
export const TAX_CURRENT_ACT_SOURCE = 'https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf';
export const TAX_TRANSITION_SOURCE = 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/objective-and-scope-new-act-faq';
export const TAX_RELIEF_SOURCE = 'https://wm.incometaxindia.gov.in/w/computation-of-tax-for-individual-1';
function slabTax(taxable, slabs) {
  let remaining = taxable, tax = 0;
  for (const [width, rate] of slabs) { const part = Math.min(remaining,width); if (part <= 0) break; tax += part*rate; remaining -= part; }
  return tax;
}
export function indiaTax(taxable, {regime='new', resident=true, ageBand='below60', period='ay2026-27'} = {}) {
  const rule = INDIA_TAX_PERIODS[period];
  if (!rule) throw new Error('Unsupported Indian tax period.');
  if (!Number.isFinite(taxable) || taxable < 0) throw new Error('Taxable income must be finite and non-negative.');
  const threshold = resident && ageBand === 'super' ? 500000 : resident && ageBand === 'senior' ? 300000 : 250000;
  const oldSlabs = threshold === 500000 ? [[500000,0],[500000,.20],[Infinity,.30]] : [[threshold,0],[500000-threshold,.05],[500000,.20],[Infinity,.30]];
  const baseTax = slabTax(taxable, regime === 'new' ? rule.newSlabs : oldSlabs);
  const limit = regime === 'new' ? rule.rebateLimit : 500000;
  let rebate = resident && taxable <= limit ? Math.min(baseTax,regime === 'new' ? rule.rebateMax : 12500) : 0;
  // Ordinary income only: relief just above the new-regime rebate threshold.
  if (resident && regime === 'new' && taxable > limit) rebate = Math.max(0,baseTax-(taxable-limit));
  const taxAfterRebate = baseTax-rebate;
  const surchargeRate = taxable > 50000000 && regime === 'old' ? .37 : taxable > 20000000 ? .25 : taxable > 10000000 ? .15 : taxable > 5000000 ? .10 : 0;
  let surcharge = taxAfterRebate*surchargeRate;
  const boundaries = [[5000000,0],[10000000,.10],[20000000,.15],...(regime === 'old' ? [[50000000,.25]] : [])];
  const applicable = boundaries.filter(([boundary])=>taxable>boundary).at(-1);
  if (applicable) {
    const [boundary,previousRate]=applicable;
    const taxAtBoundary=slabTax(boundary,regime === 'new' ? rule.newSlabs : oldSlabs)*(1+previousRate);
    surcharge=Math.min(surcharge,Math.max(0,taxAtBoundary+(taxable-boundary)-taxAfterRebate));
  }
  const cess=(taxAfterRebate+surcharge)*.04;
  return {baseTax,rebate,surcharge,cess,total:taxAfterRebate+surcharge+cess};
}
