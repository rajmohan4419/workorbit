const LANGUAGES = new Set(['en','kn','hi','ta','te','ml','mr','bn','gu','pa']);
const bucket = new Map();
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin) {
    try { if (new URL(origin).host !== host) return res.status(403).json({ error: 'Origin not allowed' }); }
    catch { return res.status(403).json({ error: 'Invalid origin' }); }
  }
  const { text, target } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 500 || !LANGUAGES.has(target)) return res.status(400).json({ error: 'Invalid translation request' });
  if (target === 'en') return res.status(200).json({ translatedText: text });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  if (bucket.size > 3000) bucket.clear();
  const entry = bucket.get(ip) || { count: 0, start: now };
  if (now - entry.start > 60000) { entry.count = 0; entry.start = now; }
  entry.count++;
  bucket.set(ip, entry);
  if (entry.count > 15) return res.status(429).json({ error: 'Please try again shortly' });
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return res.status(503).json({ error: 'Translation is not configured' });
  try {
    const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify({ q: text, source: 'en', target, format: 'text' }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return res.status(502).json({ error: 'Translation provider unavailable' });
    const data = await response.json();
    const translatedText = data?.data?.translations?.[0]?.translatedText;
    if (typeof translatedText !== 'string') return res.status(502).json({ error: 'Invalid translation response' });
    return res.status(200).json({ translatedText });
  } catch { return res.status(502).json({ error: 'Translation temporarily unavailable' }); }
}
