import { NEWS_DUPLICATE_STATUS, classifyNewsFreshness, DEFAULT_NEWS_RULES } from './newsRules';

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\\s+/g, ' ');
}

function normalizeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(value).trim();
  }
}

function publishedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function newsIdentity(item) {
  const symbol = String(item.entity?.symbol ?? item.symbol ?? '').toUpperCase();
  const exchange = String(item.entity?.exchange ?? item.exchange ?? '').toUpperCase();
  const headline = normalizeText(item.value?.headline ?? item.headline);
  const date = publishedDate(item.publishedAt ?? item.value?.publishedAt);
  return { symbol, exchange, headline, date };
}

function exactKey(item) {
  const identity = newsIdentity(item);
  const url = normalizeUrl(item.source?.url ?? item.value?.url ?? item.url);
  return [identity.exchange, identity.symbol, url ?? '', identity.headline, identity.date ?? ''].join('|');
}

function possibleKey(item) {
  const identity = newsIdentity(item);
  return [identity.exchange, identity.symbol, identity.headline].join('|');
}

function daysBetween(left, right) {
  if (!left || !right) return Infinity;
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) / (1000 * 60 * 60 * 24);
}

function annotateRecord(record, now, rules) {
  const publishedAt = record.publishedAt ?? record.value?.publishedAt ?? null;
  const retrievedAt = record.retrievedAt ?? null;
  const freshness = classifyNewsFreshness(publishedAt, now, rules);

  return {
    ...record,
    value: {
      ...record.value,
      freshness,
      publishedAt,
      retrievedAt,
      sourceTrust: record.source?.trust ?? record.value?.sourceTrust ?? null
    },
    provenance: {
      ...(record.provenance ?? {}),
      newsIntelligence: {
        freshness,
        publishedAt,
        retrievedAt,
        publicationTimeUsedForFreshness: true,
        retrievalTimeUsedOnlyForProvenance: true
      }
    }
  };
}

export function classifyNewsDuplicates(records, rules = DEFAULT_NEWS_RULES) {
  const exactGroups = new Map();
  const possibleGroups = new Map();

  records.forEach((record, index) => {
    const exact = exactKey(record);
    const possible = possibleKey(record);
    if (!exactGroups.has(exact)) exactGroups.set(exact, []);
    if (!possibleGroups.has(possible)) possibleGroups.set(possible, []);
    exactGroups.get(exact).push(index);
    possibleGroups.get(possible).push(index);
  });

  return records.map((record, index) => {
    const exactMatches = exactGroups.get(exactKey(record)) ?? [];
    const possibleMatches = possibleGroups.get(possibleKey(record)) ?? [];

    const hasExactDuplicate = exactMatches.some(other => other !== index);
    const hasPossibleDuplicate = possibleMatches.some(other => {
      if (other === index) return false;
      const left = newsIdentity(record).date;
      const right = newsIdentity(records[other]).date;
      return daysBetween(left, right) <= rules.duplicateDateWindowDays;
    });

    const duplicateStatus = hasExactDuplicate
      ? NEWS_DUPLICATE_STATUS.EXACT_DUPLICATE
      : hasPossibleDuplicate
        ? NEWS_DUPLICATE_STATUS.POSSIBLE_DUPLICATE
        : NEWS_DUPLICATE_STATUS.UNIQUE;

    return {
      ...record,
      value: {
        ...record.value,
        duplicateStatus
      },
      provenance: {
        ...(record.provenance ?? {}),
        newsIntelligence: {
          ...(record.provenance?.newsIntelligence ?? {}),
          duplicateStatus
        }
      }
    };
  });
}

export function enrichNewsEvidence(records = [], {
  now = new Date().toISOString(),
  rules = DEFAULT_NEWS_RULES
} = {}) {
  const annotated = records.map(record => annotateRecord(record, now, rules));
  return classifyNewsDuplicates(annotated, rules);
}

export function summarizeNewsIntelligence(records = []) {
  return records.reduce((summary, record) => {
    const freshness = record.value?.freshness;
    const duplicateStatus = record.value?.duplicateStatus;

    summary.total += 1;
    if (freshness === 'FRESH') summary.fresh += 1;
    if (freshness === 'AGING') summary.aging += 1;
    if (freshness === 'STALE') summary.stale += 1;
    if (freshness === 'INVALID') summary.invalid += 1;
    if (duplicateStatus === 'UNIQUE') summary.unique += 1;
    if (duplicateStatus === 'EXACT_DUPLICATE') summary.exactDuplicates += 1;
    if (duplicateStatus === 'POSSIBLE_DUPLICATE') summary.possibleDuplicates += 1;

    return summary;
  }, {
    total: 0,
    fresh: 0,
    aging: 0,
    stale: 0,
    invalid: 0,
    unique: 0,
    exactDuplicates: 0,
    possibleDuplicates: 0
  });
}
