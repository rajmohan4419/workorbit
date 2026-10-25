/**
 * Lookup a value from a second table into each row, like a VLOOKUP.
 * Keys are compared after trimming and ignoring case. When the lookup table has
 * the same key more than once, the first row is used and the key is reported.
 */
export const normaliseKey = (v) => String(v ?? '').trim().toLowerCase();

export function applyLookup({ rowKeys, lookupRows, lookupKey, returnCol }) {
  const index = new Map();
  const duplicates = new Set();

  for (const rec of lookupRows) {
    const key = normaliseKey(rec[lookupKey]);
    if (!key) continue;
    if (index.has(key)) {
      duplicates.add(String(rec[lookupKey]).trim());
      continue;
    }
    index.set(key, String(rec[returnCol] ?? '').trim());
  }

  let matched = 0;
  let unmatched = 0;
  const values = rowKeys.map((k) => {
    const key = normaliseKey(k);
    if (!key || !index.has(key)) {
      unmatched++;
      return '';
    }
    matched++;
    return index.get(key);
  });

  return {
    values,
    matched,
    unmatched,
    duplicates: [...duplicates],
  };
}
