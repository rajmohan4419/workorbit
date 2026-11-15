import { readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

// Vercel discovers supported source files under api/, excluding underscore and
// dot-prefixed paths. Tests at the root of api/ count as functions too.
// https://vercel.com/docs/functions/configuring-functions/advanced-configuration
async function entrypoints(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const discovered = await Promise.all(entries.filter(e => !/^[_.]/.test(e.name)).map(async entry => {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return entrypoints(new URL(`${entry.name}/`, dir), `${name}/`);
    return /\.(?:[cm]?js|[cm]?ts|jsx|tsx|py|go|rb|php)$/.test(name) && !name.endsWith('.d.ts') ? [name] : [];
  }));
  return discovered.flat();
}

describe('Vercel Hobby function budget', () => {
  it('keeps tests out of API discovery and stays within twelve functions', async () => {
    const routes = await entrypoints(new URL('../api/', import.meta.url));
    expect(routes.filter(route => /\.(?:test|spec)\./.test(route))).toEqual([]);
    expect(routes.length, `Discovered functions: ${routes.sort().join(', ')}`).toBeLessThanOrEqual(12);
    expect(routes).toContain('invoices.js');
    expect(routes).toContain('webhooks/razorpay.js');
  });
});
