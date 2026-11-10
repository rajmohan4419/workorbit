import { randomUUID } from 'node:crypto';
import { getClientIp, rateLimiter } from './_lib/common.js';
import { isSameOrigin } from './_lib/moments.js';
import { checkRateLimit, getAdminClient } from './_lib/supabaseClient.js';
import { MOMENT_LANGUAGE_CODES, MOMENT_SHARE_ID, MOMENT_SLUGS } from '../src/lib/moments.js';

function validText(value, maxLength) {
  return typeof value === 'string' && value.length <= maxLength && value.isWellFormed() && !value.includes('\0');
}

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

  const { action, id, slug, sender, recipient, text, language } = req.body ?? {};
  const reading = action === 'read';
  if (reading) {
    if (typeof id !== 'string' || !MOMENT_SHARE_ID.test(id)) {
      return res.status(404).json({ error: 'Greeting not found' });
    }
  } else if (action !== 'create' || !MOMENT_SLUGS.includes(slug) || !MOMENT_LANGUAGE_CODES.has(language)
      || !validText(sender, 60) || !validText(recipient, 60) || !validText(text, 8000)) {
    return res.status(400).json({ error: 'Invalid greeting' });
  }

  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Shared greetings are unavailable' });

  const ip = getClientIp(req);
  try {
    const limited = reading
      ? rateLimiter.isRateLimited(ip, 'moments-share-read', 60, 60)
      : await checkRateLimit(ip, 'moments-share-create', 10, 60, { failClosed: true });
    if (limited) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Please try again shortly' });
    }

    const shares = admin.from('moment_shares');
    if (reading) {
      const { data, error } = await shares.select('slug,sender,recipient,text,language').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Greeting not found' });
      return res.status(200).json(data);
    }

    const shareId = randomUUID();
    const { error } = await shares.insert({ id: shareId, slug, sender, recipient, text, language });
    if (error) throw error;
    return res.status(201).json({ id: shareId });
  } catch {
    return res.status(503).json({ error: 'Shared greetings are temporarily unavailable' });
  }
}
