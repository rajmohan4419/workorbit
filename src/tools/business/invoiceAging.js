/**
 * Accounts receivable ageing.
 * Each invoice needs an amount and either a due date or an invoice date plus payment terms.
 * Dates may be YYYY-MM-DD or DD/MM/YYYY (the Indian format, read as day first).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const AGING_BUCKETS = [
  { key: 'current', label: 'Not yet due', min: -Infinity, max: 0 },
  { key: 'd1_30', label: '1–30 days', min: 1, max: 30 },
  { key: 'd31_60', label: '31–60 days', min: 31, max: 60 },
  { key: 'd61_90', label: '61–90 days', min: 61, max: 90 },
  { key: 'd90plus', label: 'Over 90 days', min: 91, max: Infinity },
];

/** Parse a date string to a UTC midnight timestamp, or null if unreadable. */
export function parseDate(value) {
  const s = String(value || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const day = +m[1], month = +m[2], year = +m[3];
    const t = Date.UTC(year, month - 1, day);
    const d = new Date(t);
    if (d.getUTCDate() !== day || d.getUTCMonth() !== month - 1) return null;
    return t;
  }
  return null;
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[, ₹$]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export function bucketFor(daysOverdue) {
  return AGING_BUCKETS.find(b => daysOverdue >= b.min && daysOverdue <= b.max) || AGING_BUCKETS[0];
}

/**
 * invoices: [{ id, customer, amount, paid, dueDate, invoiceDate, termsDays }]
 * asOf: a Date or date string used as "today".
 * Returns totals per bucket, per customer, the invoice list and any row warnings.
 */
export function computeAging({ invoices, asOf, groupBy = null }) {
  const today = asOf instanceof Date
    ? Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate())
    : parseDate(asOf);
  if (today === null) throw new Error('Enter a valid "as of" date.');

  const warnings = [];
  const rows = [];

  invoices.forEach((inv, i) => {
    const label = inv.id || `row ${i + 1}`;
    const amount = num(inv.amount);
    const paid = num(inv.paid) ?? 0;
    if (amount === null || amount <= 0) {
      warnings.push(`${label}: amount is missing or not a positive number. Skipped.`);
      return;
    }

    let due = inv.dueDate ? parseDate(inv.dueDate) : null;
    if (due === null && inv.invoiceDate && num(inv.termsDays) !== null) {
      const issued = parseDate(inv.invoiceDate);
      if (issued !== null) due = issued + num(inv.termsDays) * MS_PER_DAY;
    }
    if (due === null) {
      warnings.push(`${label}: no readable due date (or invoice date with terms). Skipped.`);
      return;
    }

    const balance = Math.max(0, amount - paid);
    if (balance === 0) return; // fully paid: not outstanding

    const daysOverdue = Math.round((today - due) / MS_PER_DAY);
    rows.push({
      id: label,
      customer: inv.customer || 'Unknown',
      balance,
      daysOverdue,
      bucket: bucketFor(daysOverdue).key,
      extra: inv.extra || {},
      group: groupBy ? (String(inv.extra?.[groupBy] ?? '').trim() || 'Unassigned') : null,
    });
  });

  const buckets = Object.fromEntries(AGING_BUCKETS.map(b => [b.key, 0]));
  const byCustomerMap = {};
  let outstanding = 0;
  for (const r of rows) {
    buckets[r.bucket] += r.balance;
    outstanding += r.balance;
    byCustomerMap[r.customer] = (byCustomerMap[r.customer] || 0) + r.balance;
  }

  const groupMap = {};
  for (const r of rows) {
    if (!r.group) continue;
    const g = (groupMap[r.group] ||= { group: r.group, balance: 0, overdue: 0 });
    g.balance += r.balance;
    if (r.daysOverdue > 0) g.overdue += r.balance;
  }
  const byGroup = Object.values(groupMap).sort((a, b) => b.balance - a.balance);

  const byCustomer = Object.entries(byCustomerMap)
    .map(([customer, balance]) => ({ customer, balance }))
    .sort((a, b) => b.balance - a.balance);

  const overdue = outstanding - buckets.current;
  return {
    outstanding,
    overdue,
    overduePct: outstanding > 0 ? (overdue / outstanding) * 100 : null,
    buckets,
    byCustomer,
    byGroup,
    rows: rows.sort((a, b) => b.daysOverdue - a.daysOverdue),
    warnings,
  };
}

export const INVOICE_ALIASES = {
  id: ['invoice', 'invoiceno', 'invoicenumber', 'invoiceid', 'inv', 'ref'],
  customer: ['customer', 'client', 'customername', 'party', 'buyer'],
  amount: ['amount', 'total', 'invoiceamount', 'value', 'gross'],
  paid: ['paid', 'amountpaid', 'received', 'paymentreceived'],
  dueDate: ['duedate', 'due'],
  invoiceDate: ['invoicedate', 'date', 'issued'],
  termsDays: ['terms', 'termsdays', 'paymentterms', 'netdays'],
};
