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
  const text = String(value ?? '').trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (!iso && !dmy) return '';
  const [year, month, day] = iso ? iso.slice(1).map(Number) : [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : '';
}
