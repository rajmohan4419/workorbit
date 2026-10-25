const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Compare three pricing models for one customer profile.
 *  - per-seat: price per seat x seats
 *  - flat: one fixed monthly fee
 *  - tiered: first tier1Seats at tier1Price, the rest at tier2Price (graduated)
 *  - usage: usage above an included allowance, priced per 1,000 units
 * Annual prices apply the annual discount. MRR multiplies by the number of customers.
 */
export function computeSaasPricing({
  seats,
  perSeatPrice,
  flatPrice,
  tier1Seats,
  tier1Price,
  tier2Price,
  usageUnits,
  includedUnits,
  usagePer1000,
  annualDiscountPct,
  customers,
}) {
  const s = num(seats);
  const discount = Math.min(100, num(annualDiscountPct)) / 100;
  const count = num(customers);

  const perSeat = s * num(perSeatPrice);
  const flat = num(flatPrice);
  const t1 = Math.min(s, num(tier1Seats));
  const tiered = t1 * num(tier1Price) + Math.max(0, s - num(tier1Seats)) * num(tier2Price);
  const billableUnits = Math.max(0, num(usageUnits) - num(includedUnits));
  const usage = (billableUnits / 1000) * num(usagePer1000);

  const models = { perSeat, flat, tiered, usage };
  const result = {};
  for (const [key, monthly] of Object.entries(models)) {
    result[key] = {
      monthly,
      annual: monthly * 12 * (1 - discount),
      mrr: monthly * count,
    };
  }
  return result;
}
