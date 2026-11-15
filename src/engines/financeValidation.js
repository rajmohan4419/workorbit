/** Local parsers: no network, logging, or partial numeric coercion. */
export function strictAmount(value, empty = NaN) {
  if (value == null || String(value).trim() === '') return empty;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;
  let text = value.trim().replace(/^[₹$€£]\s*/, '');
  const negative = /^\(.*\)$/.test(text);
  if (negative) text = text.slice(1, -1).trim().replace(/^[₹$€£]\s*/, '');
  // Western or Indian grouping; reject malformed grouping and embedded whitespace.
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d+)?$/.test(text)) return NaN;
  const number = Number(text.replaceAll(',', ''));
  return Number.isFinite(number) ? (negative ? -Math.abs(number) : number) : NaN;
}
export function strictDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '';
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 60 || value > 100000) return '';
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  }
  let text = String(value ?? '').trim();
  const named = /^(\d{1,2})[- /]([A-Za-z]{3})[- /](\d{4})$/.exec(text);
  if (named) { const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(named[2].toLowerCase()) + 1; if (!month) return ''; text = `${named[3]}-${month}-${named[1]}`; }
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (!iso && !dmy) return '';
  const [year, month, day] = iso ? iso.slice(1).map(Number) : [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : '';
}

/** Integer paise with decimal half-away-from-zero rounding, never IEEE multiplication. */
export function moneyPaise(value, empty = NaN) {
  const parsed = strictAmount(value, empty);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > Number.MAX_SAFE_INTEGER / 100) return NaN;
  if (value == null || String(value).trim() === '') return empty;
  let text = typeof value === 'number' ? String(value) : value.trim();
  const negative = parsed < 0;
  text = text.replace(/[₹$€£,()\s+-]/g, '');
  if (/e/i.test(text)) text = Math.abs(parsed).toFixed(12);
  const [whole, fraction = ''] = text.split('.');
  let paise = BigInt(whole || '0') * 100n + BigInt((fraction + '00').slice(0, 2));
  if (Number(fraction[2] || 0) >= 5) paise++;
  const result = Number(negative ? -paise : paise);
  return Number.isSafeInteger(result) ? result : NaN;
}

export function sumMoney(values) {
  const total = values.reduce((sum, value) => {
    const paise = moneyPaise(value);
    if (!Number.isFinite(paise)) throw new Error('Invalid amount in total. Correct the source data.');
    return sum + BigInt(paise);
  }, 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('Combined amount exceeds the supported exact-money limit. Split this dataset.');
  return Number(total) / 100;
}

export function reviewedDate(value, order = 'reject') {
  const parts = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(String(value ?? '').trim());
  if (!parts) return strictDate(value);
  const a = Number(parts[1]), b = Number(parts[2]);
  if (order === 'reject' && a <= 12 && b <= 12 && a !== b) throw new Error(`Ambiguous date "${value}". Choose day-first or month-first after checking the source, or use YYYY-MM-DD.`);
  return strictDate(order === 'mdy' ? `${parts[3]}-${parts[1]}-${parts[2]}` : value);
}
