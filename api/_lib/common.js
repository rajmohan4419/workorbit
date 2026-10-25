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
 * In-memory rate limiter. Per warm serverless instance only, so it is a
 * best-effort fallback. Authoritative limits come from the shared store
 * (see supabaseClient.checkRateLimit). Memory is bounded by MAX_KEYS.
 */
const MAX_KEYS = 5000;

export class RateLimiter {
  constructor(maxKeys = MAX_KEYS) {
    // Key: `${ip}:${endpoint}` => Array of timestamp numbers
    this.requests = new Map();
    this.maxKeys = maxKeys;
  }

  isRateLimited(ip, endpoint, limit = 20, windowSeconds = 60) {
    const now = Date.now();
    const key = `${ip}:${endpoint}`;
    const windowMs = windowSeconds * 1000;
    const timestamps = (this.requests.get(key) || []).filter(
      (ts) => now - ts < windowMs
    );

    let limited = false;
    if (timestamps.length >= limit) {
      limited = true;
    } else {
      timestamps.push(now);
    }

    // Re-insert so Map order reflects recency, then evict the oldest keys.
    this.requests.delete(key);
    this.requests.set(key, timestamps);
    while (this.requests.size > this.maxKeys) {
      this.requests.delete(this.requests.keys().next().value);
    }
    return limited;
  }
}

/**
 * Simple in-memory cache. Per warm instance; bounded by maxKeys.
 */
export class CacheManager {
  constructor(maxKeys = MAX_KEYS) {
    // Key => { value, expiry }
    this.cache = new Map();
    this.maxKeys = maxKeys;
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
    this.cache.delete(key);
    this.cache.set(key, { value, expiry });
    while (this.cache.size > this.maxKeys) {
      this.cache.delete(this.cache.keys().next().value);
    }
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

/**
 * Client IP for rate limiting. Only trusts headers that the platform sets.
 * Order: x-vercel-forwarded-for (set by Vercel), then the right-most
 * x-forwarded-for hop (appended by the edge proxy, not by the client),
 * then x-real-ip, then the socket address.
 */
export function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const headers = req.headers || {};

  const vercelIp = headers['x-vercel-forwarded-for'];
  if (vercelIp) {
    return String(vercelIp).split(',')[0].trim();
  }

  const xff = headers['x-forwarded-for'];
  if (xff) {
    const hops = String(xff).split(',').map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }

  const realIp = headers['x-real-ip'];
  if (realIp) {
    return String(realIp).trim();
  }

  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return '127.0.0.1';
}

/**
 * Exact-match origin allowlist. Parses the Origin as a URL and compares
 * scheme + host + port with the allowlist. Substring matching is not used,
 * so https://orbitboard.in.attacker.example is rejected.
 */
const DEFAULT_TRUSTED_ORIGINS = [
  'https://orbitboard.in',
  'https://www.orbitboard.in',
  'https://app.orbitboard.in',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function resolveAllowedOrigin(origin, extraOrigins = []) {
  if (!origin || typeof origin !== 'string') return null;

  let url;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }

  // Reject credentials, paths and anything that is not a bare origin.
  if (url.username || url.password) return null;
  if (url.pathname !== '/' || url.search || url.hash) return null;

  const normalised = `${url.protocol}//${url.host}`;
  const allowed = new Set([...DEFAULT_TRUSTED_ORIGINS, ...extraOrigins]);
  return allowed.has(normalised) ? normalised : null;
}

function configuredOrigins() {
  const raw = globalThis.process?.env?.ALLOWED_ORIGINS || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function getCorsHeaders(origin) {
  const allowed = resolveAllowedOrigin(origin, configuredOrigins());
  return {
    // Untrusted origins get the production origin, which the browser will
    // then refuse to expose to the caller's script.
    'Access-Control-Allow-Origin': allowed || 'https://orbitboard.in',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}
