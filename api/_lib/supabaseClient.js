import { createClient } from '@supabase/supabase-js';
import { cacheManager, rateLimiter } from './common.js';

const supabaseUrl = globalThis.process?.env?.VITE_SUPABASE_URL || globalThis.process?.env?.SUPABASE_URL;
const serviceRoleKey = globalThis.process?.env?.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

if (supabaseUrl && serviceRoleKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.warn('[SUPABASE CLIENT WARNING] Failed to initialize Supabase admin client:', err.message);
  }
}

/**
 * Hash IP address using SHA-256 for privacy-conscious storage and rate limiting keys.
 * @param {string} ip
 * @returns {Promise<string>}
 */
export async function hashIp(ip) {
  if (!ip) return 'anonymous_hash';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + '_orbitboard_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  } catch {
    return 'fallback_hash';
  }
}

/**
 * Checks rate limit atomically using Supabase RPC or falls back to in-memory rate limiter.
 * @param {string} clientIp
 * @param {string} endpoint - 'search' | 'stock' | 'analyze'
 * @param {number} limit
 * @param {number} windowSeconds
 * @returns {Promise<boolean>} true if rate limited, false if allowed
 */
export async function checkRateLimit(clientIp, endpoint, limit = 20, windowSeconds = 60) {
  if (supabaseAdmin) {
    try {
      const ipHash = await hashIp(clientIp);
      const rateLimitKey = `rate_limit:${endpoint}:${ipHash}`;

      const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
        p_key: rateLimitKey,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });

      if (!error && typeof data === 'boolean') {
        return data; // Returns true if limited
      }
      if (error) {
        console.warn('[RATE LIMIT RPC ERROR]', error.message);
      }
    } catch (e) {
      console.warn('[RATE LIMIT EXCEPTION]', e.message);
    }
  }

  // Fallback to in-memory rate limiter
  return rateLimiter.isRateLimited(clientIp, endpoint, limit, windowSeconds);
}

/**
 * Retrieves cached value from Supabase market_cache table or in-memory cache.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function getMarketCache(key) {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('market_cache')
        .select('value, expires_at')
        .eq('key', key)
        .maybeSingle();

      if (!error && data) {
        const expiresAt = new Date(data.expires_at).getTime();
        if (Date.now() < expiresAt) {
          return data.value;
        }
        // Asynchronously clean up expired key
        supabaseAdmin.from('market_cache').delete().eq('key', key).then();
      }
    } catch (e) {
      console.warn('[MARKET CACHE GET ERROR]', e.message);
    }
  }

  return cacheManager.get(key);
}

/**
 * Sets cached value in Supabase market_cache table and in-memory cache.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 */
export async function setMarketCache(key, value, ttlSeconds) {
  cacheManager.set(key, value, ttlSeconds);

  if (supabaseAdmin) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      await supabaseAdmin.from('market_cache').upsert(
        { key, value, expires_at: expiresAt },
        { onConflict: 'key' }
      );
    } catch (e) {
      console.warn('[MARKET CACHE SET ERROR]', e.message);
    }
  }
}
