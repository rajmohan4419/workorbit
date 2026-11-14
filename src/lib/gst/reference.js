export const RATE_SOURCE = 'https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html';
export const ICEGATE_SOURCE = 'https://www.icegate.gov.in/Webappl/Codes';
let referencePromise;

export function loadGstReference() {
  if (!referencePromise) {
    referencePromise = Promise.all(['codes', 'rates', 'manifest'].map(async name => {
      const response = await fetch(`/data/gst/${name}.json`);
      if (!response.ok) throw new Error('Reference files could not be loaded. You can still enter details manually.');
      return response.json();
    })).then(([codes, rates, manifest]) => ({
      codes: codes.map(row => ({ ...row, searchText: `${row.code} ${row.description}`.toLowerCase() })), rates, manifest,
    })).catch(error => { referencePromise = null; throw error; });
  }
  return referencePromise;
}

export function searchClassifications(codes, query, kind = 'all', limit = 15) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/);
  return codes.filter(row => (kind === 'all' || row.kind === kind)
    && tokens.every(token => (row.searchText || `${row.code} ${row.description}`.toLowerCase()).includes(token)))
    .sort((a, b) => score(b, q) - score(a, q) || a.code.localeCompare(b.code))
    .slice(0, limit);
}

function score(row, query) {
  return row.code === query ? 4 : row.code.startsWith(query) ? 3 : row.description.toLowerCase().startsWith(query) ? 2 : 1;
}

// Match whole heading tokens only. Never inherit a chapter rate as a confirmed child rate.
export function findRateReferences(rates, entry) {
  if (!entry) return [];
  return rates.filter(rate => rate.kind === entry.kind
    && (rate.heading.replace(/\b(\d{4})\s+(\d{2})(?:\s+(\d{2}))?\b/g, (_, head, sub, item) => head + sub + (item || ''))
      .match(/\b\d{2,8}\b/g) || []).some(code => entry.code.startsWith(code) || code.startsWith(entry.code)));
}

export function exactRateHeading(row, code) {
  return (row.heading.replace(/\b(\d{4})\s+(\d{2})(?:\s+(\d{2}))?\b/g, (_, head, sub, item) => head + sub + (item || ''))
    .match(/\b\d{2,8}\b/g) || []).includes(code);
}

export function applicableNumericRate(row) {
  const number = value => /^\d+(\.\d+)?%?$/.test(value.replace(/\s/g, '')) ? Number(value.replace(/[%\s]/g, '')) : null;
  const igst = number(row.igst), cgst = number(row.cgst), sgst = number(row.sgst);
  // Cess, RCM and specially valued supplies need a richer engine than this invoice tool.
  if (igst === null || cgst === null || sgst === null || igst > 100
    || Math.abs(cgst + sgst - igst) > 0.001 || Math.abs(cgst - sgst) > 0.001
    || row.condition.trim() || /reverse charge|valuation|paragraph 2|per cent of|per unit/i.test(row.description)) return null;
  return igst;
}
