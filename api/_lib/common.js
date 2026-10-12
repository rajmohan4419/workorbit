const SYMBOL_REGEX = /^[A-Za-z0-9.^\\-]{1,20}$/;

const PROHIBITED_PATTERNS = [
  /\b(buy|sell|hold)\b/i,
  /\btarget\s+price\b/i,
  /\bprice\s+target\b/i,
  /\bshould\s+(invest|buy|sell|hold)\b/i,
  /\brecommend(ation|ed|s)?\b/i,
  /\b(investment|financial)\s+advice\b/i,
  /\b(outperform|underperform)\b/i,
  /\b(strong\s+buy|strong\s+sell)\b/i,
  /\b(entry\s+point|stop\s+loss)\b/i,
];

export function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return false;
  }
  return SYMBOL_REGEX.test(symbol.trim());
}

export function validateQuery(q) {
  if (!q || typeof q !== 'string') {
    return null;
  }
  const cleaned = q.trim();
  if (!cleaned || cleaned.length > 60) {
    return null;
  }
  return cleaned;
}

/**
  * Simple in-memory rate limiter.
  * Note: In serverless environments (e.g. Vercel Functions), this rate limiter state
  * is preserved per lambda instance container across warm invocations.
  */
export class RateLimiter {
  constructor() {
    // Key: `${ip}:${endpoint}` => Array of timestamp numbers
    this.requests = new Map();
  }

  isRateLimited(ip, endpoint, limit = 20, windowSeconds = 60) {
    const now = Date.now();
    const key = `${ip}:${endpoint}`;
    const windowMs = windowSeconds * 1000;
    const timestamps = (this.requests.get(key) || []).filter(
      (ts) => now - ts < windowMs
    );

    if (timestamps.length >= limit) {
      this.requests.set(key, timestamps);
      return true;
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return false;
  }
}

/**
  * Simple in-memory CacheManager.
  * Note: In serverless environments, this cache state is kept per warm instance container.
  */
export class CacheManager {
  constructor() {
    // Key => { value, expiry }
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const { value, expiry } = this.cache.get(key);
      if (Date.now() < expiry) {
        return value;
      }
      this.cache.delete(key);
    }
    return null;
  }

  set(key, value, ttlSeconds) {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }
}

export const rateLimiter = new RateLimiter();
export const cacheManager = new CacheManager();

export function containsRecommendation(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  return PROHIBITED_PATTERNS.some((pattern) => pattern.test(text));
}

export function filterAnalysisData(data) {
  const rejections = [];

  function checkText(text, fieldName) {
    if (containsRecommendation(text)) {
      rejections.push(`Recommendation language detected in field '${fieldName}': ${text}`);
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

  if (Array.isArray(data.things_to_watch)) {
    data.things_to_watch.forEach((item, idx) => {
      if (typeof item === 'string') {
        checkText(item, `things_to_watch[${idx}]`);
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

  if (rejections.length > 0) {
    rejections.forEach((rej) => {
      console.warn('[ANALYSIS REJECTED]', rej);
    });
    return { valid: false, rejections };
  }

  return { valid: true, rejections: [] };
}

export function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const headers = req.headers || {};
  const xForwardedFor = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  if (xForwardedFor) {
    return String(xForwardedFor).split(',')[0].trim();
  }
  const xRealIp = headers['x-real-ip'] || headers['X-Real-IP'];
  if (xRealIp) {
    return String(xRealIp).trim();
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return '127.0.0.1';
}

export function getCorsHeaders(origin) {
  let allowedOrigin = 'https://orbitboard.in';
  if (origin && (origin.includes('localhost') || origin.includes('orbitboard.in') || origin.includes('127.0.0.1'))) {
    allowedOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}
