export const NEWS_FRESHNESS = Object.freeze({
  FRESH: 'FRESH',
  AGING: 'AGING',
  STALE: 'STALE',
  INVALID: 'INVALID'
});

export const NEWS_DUPLICATE_STATUS = Object.freeze({
  UNIQUE: 'UNIQUE',
  EXACT_DUPLICATE: 'EXACT_DUPLICATE',
  POSSIBLE_DUPLICATE: 'POSSIBLE_DUPLICATE'
});

export const DEFAULT_NEWS_RULES = Object.freeze({
  freshWithinHours: 24,
  agingWithinHours: 72,
  duplicateDateWindowDays: 2
});

export function classifyNewsFreshness(publishedAt, now = new Date(), rules = DEFAULT_NEWS_RULES) {
  const published = new Date(publishedAt);
  const current = new Date(now);

  if (!publishedAt || Number.isNaN(published.getTime()) || Number.isNaN(current.getTime())) {
    return NEWS_FRESHNESS.INVALID;
  }

  const ageHours = (current.getTime() - published.getTime()) / (1000 * 60 * 60);

  if (ageHours < 0) return NEWS_FRESHNESS.INVALID;
  if (ageHours <= rules.freshWithinHours) return NEWS_FRESHNESS.FRESH;
  if (ageHours <= rules.agingWithinHours) return NEWS_FRESHNESS.AGING;
  return NEWS_FRESHNESS.STALE;
}
