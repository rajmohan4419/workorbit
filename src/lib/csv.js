/**
 * Small RFC 4180-style CSV parser. Handles quoted fields, escaped quotes,
 * embedded commas and newlines, CRLF or LF line endings, and a UTF-8 BOM.
 * Runs entirely in the browser; uploaded files never leave the device.
 */
export function parseCsv(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  // Drop fully blank lines.
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

/** Turn a header into a comparable key: "Due Date" -> "duedate". */
export function normaliseHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parse CSV text into objects keyed by the header row.
 * Returns { headers, records }. Records are arrays of cell values keyed by the
 * original header, so callers can map aliases with mapColumns().
 */
export function csvToRecords(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map(h => h.trim());
  const records = rows.slice(1).map(cells => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] ?? '').trim(); });
    return obj;
  });
  return { headers, records };
}

/**
 * Find the column for each logical field using a list of accepted aliases.
 * mapColumns(headers, { customer: ['customer', 'client'] }) -> { customer: 'Client' }
 */
export function mapColumns(headers, aliasMap) {
  const normalised = headers.map(h => ({ raw: h, key: normaliseHeader(h) }));
  const mapped = {};
  for (const [field, aliases] of Object.entries(aliasMap)) {
    const hit = normalised.find(h => aliases.includes(h.key));
    mapped[field] = hit ? hit.raw : null;
  }
  return mapped;
}

/** Build a CSV string from rows of cell values, quoting when needed. */
export function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map(r => r.map(esc).join(',')).join('\r\n');
}
