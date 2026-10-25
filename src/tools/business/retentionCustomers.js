/**
 * Build retention totals from a customer-level list: one row per customer with
 * their recurring revenue at the start and end of the period.
 *   start > 0, end = 0      -> churned (all of their start MRR is lost)
 *   start > 0, 0 < end < start -> downgrade
 *   start > 0, end > start  -> expansion
 *   start = 0, end > 0      -> new in the period (not part of retention)
 */
export const RETENTION_ALIASES = {
  customer: ['customer', 'client', 'account', 'name'],
  startMrr: ['startmrr', 'startingmrr', 'openingmrr', 'mrrstart', 'mrrbefore', 'previousmrr', 'startrevenue'],
  endMrr: ['endmrr', 'closingmrr', 'mrrend', 'mrrafter', 'currentmrr', 'endrevenue', 'mrr'],
};

const toNumber = (v) => {
  const text = String(v ?? '').trim();
  if (text === '') return null; // blank is missing, not zero
  const n = Number(text.replace(/[, ₹$]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function retentionFromCustomers(rows) {
  const totals = {
    startMrr: 0, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0,
    startCustomers: 0, churnedCustomers: 0, newCustomers: 0,
  };
  const warnings = [];

  rows.forEach((row, i) => {
    const label = row.customer || `Row ${i + 1}`;
    const start = toNumber(row.startMrr);
    const end = toNumber(row.endMrr);
    if (start === null || end === null) {
      warnings.push(`${label}: start or end MRR is missing or not a number. Skipped.`);
      return;
    }
    if (start === 0) {
      if (end > 0) totals.newCustomers += 1;
      return;
    }
    totals.startMrr += start;
    totals.startCustomers += 1;
    if (end === 0) {
      totals.churnedMrr += start;
      totals.churnedCustomers += 1;
    } else if (end < start) {
      totals.contractionMrr += start - end;
    } else if (end > start) {
      totals.expansionMrr += end - start;
    }
  });

  return { totals, warnings };
}
