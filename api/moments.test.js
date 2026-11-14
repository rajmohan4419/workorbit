import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, getAdminClient } from './_lib/supabaseClient.js';
import share from './moment-shares.js';
import translate from './translate.js';

vi.mock('./_lib/supabaseClient.js', () => ({
  checkRateLimit: vi.fn(),
  getAdminClient: vi.fn(),
}));

const origin = 'https://orbit.example';
const headers = {
  host: 'orbit.example',
  origin,
  'content-type': 'application/json',
  'x-forwarded-proto': 'https',
  'x-vercel-forwarded-for': '192.0.2.12',
};

async function request(handler, body, options = {}) {
  const result = { headers: {} };
  const res = {
    setHeader: (name, value) => { result.headers[name] = value; },
    status: (status) => { result.status = status; return res; },
    json: (data) => { result.data = data; return res; },
  };
  await handler({ method: 'POST', headers, body, ...options }, res);
  return result;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', 'test-key');
  vi.stubGlobal('fetch', vi.fn());
  getAdminClient.mockReturnValue({});
  checkRateLimit.mockResolvedValue(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Moments translation', () => {
  const payload = { text: 'Happy birthday', target: 'kn' };

  it('rejects unsupported methods, origins, content types and inputs before contacting Google', async () => {
    const get = await request(translate, null, { method: 'GET' });
    expect(get).toMatchObject({ status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
    for (const badOrigin of [undefined, 'null', 'http://orbit.example', 'https://elsewhere.example']) {
      expect((await request(translate, payload, { headers: { ...headers, origin: badOrigin } })).status).toBe(403);
    }
    expect((await request(translate, payload, { headers: { ...headers, 'content-type': 'text/plain' } })).status).toBe(415);
    expect((await request(translate, { ...payload, target: 'invalid' })).status).toBe(400);
    expect((await request(translate, { ...payload, text: 'a'.repeat(501) })).status).toBe(400);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns English without credentials or quota use', async () => {
    vi.stubEnv('GOOGLE_TRANSLATE_API_KEY', '');
    getAdminClient.mockReturnValue(null);
    expect(await request(translate, { ...payload, target: 'en' })).toMatchObject({
      status: 200, data: { translatedText: payload.text },
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires the shared limiter and rejects a limited IP before contacting Google', async () => {
    getAdminClient.mockReturnValueOnce(null);
    expect((await request(translate, payload)).status).toBe(503);
    checkRateLimit.mockResolvedValueOnce(true);
    expect(await request(translate, payload)).toMatchObject({ status: 429, headers: { 'Retry-After': '60' } });
    expect(checkRateLimit).toHaveBeenCalledWith('192.0.2.12', 'moments-translate', 15, 60, { failClosed: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the fixed Basic v2 endpoint and sends the key in the request header', async () => {
    fetch.mockResolvedValueOnce(Response.json({ data: { translations: [{ translatedText: 'ಶುಭಾಶಯಗಳು' }] } }));
    expect(await request(translate, payload)).toMatchObject({ status: 200, data: { translatedText: 'ಶುಭಾಶಯಗಳು' } });
    expect(fetch).toHaveBeenCalledWith('https://translation.googleapis.com/language/translate/v2', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': 'test-key' },
      redirect: 'error',
      body: JSON.stringify({ q: payload.text, source: 'en', target: 'kn', format: 'text' }),
    }));
  });

  it.each([
    [403, { message: 'Daily Limit Exceeded' }, null, 429, undefined, 'daily translation quota'],
    [403, { message: 'User Rate Limit Exceeded' }, null, 429, '60', 'Translation is busy'],
    [403, { errors: [{ reason: 'rateLimitExceeded' }] }, null, 429, '60', 'Translation is busy'],
    [429, {}, '120', 429, '120', 'Translation is busy'],
    [403, { message: 'API key blocked', errors: [{ reason: 'forbidden' }] }, null, 502, undefined, 'provider unavailable'],
    [500, {}, null, 502, undefined, 'provider unavailable'],
  ])('maps Google %s and %j to the public response', async (status, error, retry, expectedStatus, expectedRetry, message) => {
    fetch.mockResolvedValueOnce(Response.json({ error }, { status, headers: retry ? { 'Retry-After': retry } : {} }));
    const result = await request(translate, payload);
    expect(result.status).toBe(expectedStatus);
    expect(result.headers['Retry-After']).toBe(expectedRetry);
    expect(result.data.error).toContain(message);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('Moments shares', () => {
  const snapshot = { slug: 'birthday', sender: 'Asha', recipient: 'Sam', text: 'ಶುಭಾಶಯಗಳು ✨', language: 'kn' };

  it.each(['birthday', 'chhath-puja', 'christmas'])('saves and reads a %s snapshot by its server-generated ID', async (slug) => {
    const greeting = { ...snapshot, slug };
    const rows = new Map();
    const admin = {
      from: vi.fn(() => ({
        insert: async ({ id, ...greeting }) => { rows.set(id, greeting); return { error: null }; },
        select: () => ({ eq: (_, id) => ({ maybeSingle: async () => ({ data: rows.get(id) }) }) }),
      })),
    };
    getAdminClient.mockReturnValue(admin);

    const saved = await request(share, { action: 'create', ...greeting });
    expect(saved).toMatchObject({ status: 201, headers: { 'Cache-Control': 'no-store' } });
    expect(Object.keys(saved.data)).toEqual(['id']);
    expect(checkRateLimit).toHaveBeenCalledWith('192.0.2.12', 'moments-share-create', 10, 60, { failClosed: true });

    const edited = await request(share, { action: 'create', ...greeting, text: 'New wishes' });
    expect(edited.data.id).not.toBe(saved.data.id);
    expect(await request(share, { action: 'read', id: saved.data.id })).toMatchObject({ status: 200, data: greeting });
    expect((await request(share, { action: 'read', id: '00000000-0000-4000-8000-000000000001' })).status).toBe(404);
  });

  it('rejects invalid or throttled writes and handles storage failure', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'internal details' } });
    const from = vi.fn(() => ({ insert }));
    getAdminClient.mockReturnValue({ from });
    expect((await request(share, { action: 'create', ...snapshot, sender: 'a'.repeat(61) })).status).toBe(400);
    expect((await request(share, { action: 'read', id: 'invalid' })).status).toBe(404);
    checkRateLimit.mockResolvedValueOnce(true);
    expect((await request(share, { action: 'create', ...snapshot })).status).toBe(429);
    expect(from).not.toHaveBeenCalled();
    expect(await request(share, { action: 'create', ...snapshot })).toMatchObject({
      status: 503, data: { error: 'Shared greetings are temporarily unavailable' },
    });
  });
});
