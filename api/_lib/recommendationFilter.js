/**
 * Recommendation and Advisory Language Filter
 * Strictly flags buy/sell/hold advice, target prices, directional sentiment,
 * and investment recommendations while protecting legitimate factual terms.
 */

// Patterns that unequivocally indicate investment recommendations or price predictions
const PROHIBITED_PATTERNS = [
  /\b(buy|sell|hold)\b(?!\s+(?:back|out|ing|ers|ing\s+company))/i,
  /\b(target\s+price|price\s+target)\b/i,
  /\bshould\s+(?:invest|buy|sell|hold|allocate)\b/i,
  /\b(outperform|underperform)\b/i,
  /\b(strong\s+buy|strong\s+sell)\b/i,
  /\b(entry\s+point|stop\s+loss)\b/i,
  /\b(bullish|bearish)\b(?!\s+(?:engulfing|flag|harami)\s+pattern)/i,
  /\b(strong\s+upside|strong\s+downside)\b/i,
  /\b(kharido|becho)\b/i,
  /\brecommend(?:ation|ed|s)?\b/i,
  /\b(?:investment|financial)\s+advice\b/i,
  /\bgo\s+long\b/i,
  /\bgo\s+short\b/i,
];

// Contextual exemptions for false-positive protection (e.g. "share buyback", "holding company")
const ALLOWED_EXCEPTIONS = [
  /share\s+buyback/i,
  /stock\s+buyback/i,
  /buyback\s+offer/i,
  /holding\s+company/i,
  /holdings?\b/i,
  /held\s+a\s+meeting/i,
  /sellers?\b/i,
  /buyers?\b/i,
];

/**
 * Checks whether a piece of text contains prohibited recommendation language.
 * @param {string} text
 * @returns {boolean} true if recommendation language detected, false otherwise
 */
export function containsRecommendation(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const cleanText = text.trim();
  if (!cleanText) return false;

  // Check if text matches any prohibited pattern
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(cleanText)) {
      // Check if matches an allowed exception
      const isExcepted = ALLOWED_EXCEPTIONS.some((exc) => exc.test(cleanText));
      if (!isExcepted) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates an entire AI analysis data payload against prohibited language rules.
 * @param {object} data - AI JSON response
 * @returns {{ valid: boolean, rejections: string[] }}
 */
export function filterAnalysisData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, rejections: ['Invalid or missing analysis data structure'] };
  }

  const rejections = [];

  function checkText(text, fieldName) {
    if (containsRecommendation(text)) {
      rejections.push(`Recommendation language detected in field '${fieldName}': "${text}"`);
    }
  }

  if (typeof data.summary === 'string') {
    checkText(data.summary, 'summary');
  }

  if (Array.isArray(data.timeline)) {
    data.timeline.forEach((item, idx) => {
      if (item && typeof item.event === 'string') {
        checkText(item.event, `timeline[${idx}].event`);
      }
    });
  }

  if (Array.isArray(data.news_takeaways)) {
    data.news_takeaways.forEach((item, idx) => {
      if (item && typeof item.point === 'string') {
        checkText(item.point, `news_takeaways[${idx}].point`);
      }
    });
  }

  if (Array.isArray(data.upcoming_events)) {
    data.upcoming_events.forEach((item, idx) => {
      if (item && typeof item.event === 'string') {
        checkText(item.event, `upcoming_events[${idx}].event`);
      }
    });
  }

  if (Array.isArray(data.data_gaps)) {
    data.data_gaps.forEach((item, idx) => {
      if (typeof item === 'string') {
        checkText(item, `data_gaps[${idx}]`);
      }
    });
  }

  return {
    valid: rejections.length === 0,
    rejections,
  };
}
