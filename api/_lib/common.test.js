import { describe, expect, it } from 'vitest';
import { resolveAllowedOrigin, getClientIp as getIp, getCorsHeaders as corsFor } from './common.js';

describe('resolveAllowedOrigin', () => {
  it('accepts exact trusted origins', () => {
    expect(resolveAllowedOrigin('https://orbitboard.in')).toBe('https://orbitboard.in');
    expect(resolveAllowedOrigin('https://app.orbitboard.in')).toBe('https://app.orbitboard.in');
    expect(resolveAllowedOrigin('http://localhost:5173')).toBe('http://localhost:5173');
  });

  it('rejects lookalike domains that contain a trusted string', () => {
    expect(resolveAllowedOrigin('https://orbitboard.in.attacker.example')).toBeNull();
    expect(resolveAllowedOrigin('https://evil-orbitboard.in')).toBeNull();
    expect(resolveAllowedOrigin('https://localhost.evil.test')).toBeNull();
  });

  it('rejects the wrong scheme or port', () => {
    expect(resolveAllowedOrigin('http://orbitboard.in')).toBeNull();
    expect(resolveAllowedOrigin('https://localhost:8080')).toBeNull();
  });

  it('rejects userinfo tricks and non-origin URLs', () => {
    expect(resolveAllowedOrigin('https://orbitboard.in@evil.test')).toBeNull();
    expect(resolveAllowedOrigin('https://orbitboard.in/path')).toBeNull();
    expect(resolveAllowedOrigin('not a url')).toBeNull();
    expect(resolveAllowedOrigin('null')).toBeNull();
    expect(resolveAllowedOrigin(undefined)).toBeNull();
  });

  it('accepts extra origins passed in explicitly', () => {
    expect(resolveAllowedOrigin('https://staging.orbitboard.in', ['https://staging.orbitboard.in'])).toBe('https://staging.orbitboard.in');
  });
});

describe('getCorsHeaders (exact allowlist)', () => {
  it('echoes a trusted origin and varies on Origin', () => {
    const h = corsFor('https://orbitboard.in');
    expect(h['Access-Control-Allow-Origin']).toBe('https://orbitboard.in');
    expect(h['Vary']).toBe('Origin');
  });

  it('never reflects an attacker origin', () => {
    const h = corsFor('https://orbitboard.in.attacker.example');
    expect(h['Access-Control-Allow-Origin']).toBe('https://orbitboard.in');
  });
});

describe('getClientIp (proxy headers)', () => {
  it('prefers the Vercel-set forwarded IP', () => {
    expect(getIp({ headers: { 'x-vercel-forwarded-for': '203.0.113.7', 'x-forwarded-for': '1.1.1.1, 203.0.113.7' } })).toBe('203.0.113.7');
  });

  it('uses the right-most x-forwarded-for hop, not a client-supplied first value', () => {
    expect(getIp({ headers: { 'x-forwarded-for': '10.0.0.1, 198.51.100.4' } })).toBe('198.51.100.4');
  });

  it('falls back to the socket address', () => {
    expect(getIp({ headers: {}, socket: { remoteAddress: '192.0.2.9' } })).toBe('192.0.2.9');
  });
});
