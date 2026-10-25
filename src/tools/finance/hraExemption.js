const safe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * HRA exemption under Section 10(13A) of the Income Tax Act (old tax regime).
 * Exempt amount = least of:
 *   1. actual HRA received
 *   2. 50% of basic salary (metro) or 40% (non-metro)
 *   3. rent paid minus 10% of basic salary
 */
export function computeHraExemption({ basicAnnual, hraReceivedAnnual, rentPaidAnnual, metro }) {
  const basic = safe(basicAnnual);
  const hra = safe(hraReceivedAnnual);
  const rent = safe(rentPaidAnnual);

  const limitPct = metro ? 0.5 : 0.4;
  const limits = {
    actualHra: hra,
    percentOfBasic: basic * limitPct,
    rentMinusTenPercent: Math.max(0, rent - basic * 0.1),
  };

  const exempt = Math.min(limits.actualHra, limits.percentOfBasic, limits.rentMinusTenPercent);
  return {
    exempt,
    taxable: hra - exempt,
    binding: Object.keys(limits).find(k => limits[k] === exempt),
  };
}
