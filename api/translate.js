import process from 'node:process';
import { getClientIp } from './_lib/common.js';
import { isSameOrigin } from './_lib/moments.js';
import { checkRateLimit, getAdminClient } from './_lib/supabaseClient.js';
import { MOMENT_LANGUAGE_CODES } from '../src/lib/moments.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Origin not allowed' });
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    return res.status(415).json({ error: 'JSON required' });
  }

  const { text, target } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim() || text.length > 500 || !MOMENT_LANGUAGE_CODES.has(target)) {
    return res.status(400).json({ error: 'Invalid translation request' });
  }
  if (target === 'en') return res.status(200).json({ translatedText: text });

  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key || !getAdminClient()) return res.status(503).json({ error: 'Translation is not configured' });
  if (await checkRateLimit(getClientIp(req), 'moments-translate', 15, 60, { failClosed: true })) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many translation requests. Please try again shortly' });
  }

  try {
    const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify({ q: text, source: 'en', target, format: 'text' }),
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const details = Array.isArray(data?.error?.errors) ? data.error.errors : [];
      const reasons = new Set(details.map(detail => detail?.reason));
      const message = data?.error?.message ?? '';
      if (response.status === 403 && (reasons.has('dailyLimitExceeded') || /^Daily Limit Exceeded\b/i.test(message))) {
        return res.status(429).json({ error: 'The daily translation quota has been reached. Try again after midnight Pacific time' });
      }
      if (response.status === 429 || (response.status === 403
          && (reasons.has('userRateLimitExceeded') || reasons.has('rateLimitExceeded') || /^User Rate Limit Exceeded\b/i.test(message)))) {
        const retryAfter = response.headers.get('Retry-After');
        res.setHeader('Retry-After', retryAfter || '60');
        return res.status(429).json({ error: 'Translation is busy. Please try again shortly' });
      }
      return res.status(502).json({ error: 'Translation provider unavailable' });
    }
    const translatedText = data?.data?.translations?.[0]?.translatedText;
    if (typeof translatedText !== 'string' || !translatedText.trim()) {
      return res.status(502).json({ error: 'Invalid translation response' });
    }
    return res.status(200).json({ translatedText });
  } catch {
    return res.status(502).json({ error: 'Translation temporarily unavailable' });
  }
}
