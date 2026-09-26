import { IDENTIFIER_TYPES, createSecurityIdentifier, identifierKey } from './identifierModel';

export function createIdentifierResolver(seed = []) {
  const records = new Map();

  for (const item of seed) {
    const identifier = item?.identifier ?? item;
    if (!identifier?.value || !identifier?.type) continue;
    records.set(identifierKey(identifier), identifier);
  }

  return {
    add(identifier) {
      const normalized = createSecurityIdentifier(identifier);
      records.set(identifierKey(normalized), normalized);
      return normalized;
    },

    resolve(query) {
      if (!query) return null;

      if (query.type && query.value) {
        return records.get(identifierKey(query)) ?? null;
      }

      const candidates = [];
      for (const type of Object.values(IDENTIFIER_TYPES)) {
        const value = query[type.toLowerCase()] ?? query.value;
        if (!value) continue;
        for (const identifier of records.values()) {
          if (
            identifier.type === type
            && String(identifier.value).toUpperCase() === String(value).toUpperCase()
            && (!query.exchange || identifier.exchange === query.exchange)
          ) {
            candidates.push(identifier);
          }
        }
      }

      return candidates.length === 1 ? candidates[0] : null;
    },

    all() {
      return [...records.values()];
    }
  };
}
