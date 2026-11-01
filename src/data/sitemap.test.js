// src/data/sitemap.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS, LISTED_TOOLS } from './toolCatalog.js';
import toolVariants from './toolVariants.json';

const PUBLIC_SITEMAP = path.resolve('public/sitemap.xml');
const DIST_SITEMAP = path.resolve('dist/sitemap.xml');

describe('Sitemap Automation & Catalog Consistency Suite', () => {
  it('public/sitemap.xml and dist/sitemap.xml exist and contain valid XML structure', () => {
    expect(fs.existsSync(PUBLIC_SITEMAP), 'public/sitemap.xml must exist').toBe(true);
    expect(fs.existsSync(DIST_SITEMAP), 'dist/sitemap.xml must exist').toBe(true);

    const publicContent = fs.readFileSync(PUBLIC_SITEMAP, 'utf8');
    const distContent = fs.readFileSync(DIST_SITEMAP, 'utf8');

    expect(publicContent).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(publicContent).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(publicContent).toContain('</urlset>');

    expect(distContent).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(distContent).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(distContent).toContain('</urlset>');

    // Both files should match in content
    expect(publicContent.trim()).toBe(distContent.trim());
  });

  it('contains all required static routes', () => {
    const sitemap = fs.readFileSync(PUBLIC_SITEMAP, 'utf8');
    const requiredStaticRoutes = [
      'https://orbitboard.in/',
      'https://orbitboard.in/tools',
      'https://orbitboard.in/about',
      'https://orbitboard.in/contact',
      'https://orbitboard.in/privacy',
      'https://orbitboard.in/terms',
      'https://orbitboard.in/pricing',
    ];

    for (const route of requiredStaticRoutes) {
      expect(sitemap, `Sitemap must contain static route ${route}`).toContain(`<loc>${route}</loc>`);
    }
  });

  it('contains every single live tool from LISTED_TOOLS', () => {
    const sitemap = fs.readFileSync(PUBLIC_SITEMAP, 'utf8');
    expect(LISTED_TOOLS.length).toBeGreaterThan(0);

    for (const tool of LISTED_TOOLS) {
      const expectedUrl = `https://orbitboard.in/tools/${tool.slug}`;
      expect(
        sitemap,
        `Sitemap must contain live tool: ${tool.name} (${tool.slug})`
      ).toContain(`<loc>${expectedUrl}</loc>`);
    }
  });

  it('contains every programmatic tool variant from toolVariants.json', () => {
    const sitemap = fs.readFileSync(PUBLIC_SITEMAP, 'utf8');
    expect(toolVariants.length).toBeGreaterThan(0);
    expect(toolVariants.length).toBeLessThanOrEqual(150);

    for (const variant of toolVariants) {
      const expectedUrl = `https://orbitboard.in/tools/${variant.slug}`;
      expect(
        sitemap,
        `Sitemap must contain tool variant: ${variant.name} (${variant.slug})`
      ).toContain(`<loc>${expectedUrl}</loc>`);
    }
  });

  it('strictly excludes all planned tools (status === "planned")', () => {
    const sitemap = fs.readFileSync(PUBLIC_SITEMAP, 'utf8');
    const plannedTools = TOOLS.filter((t) => t.status === 'planned');

    expect(plannedTools.length).toBeGreaterThan(0);

    for (const tool of plannedTools) {
      const plannedUrl = `https://orbitboard.in/tools/${tool.slug}`;
      expect(
        sitemap,
        `Sitemap must NOT contain planned tool: ${tool.name} (${tool.slug})`
      ).not.toContain(`<loc>${plannedUrl}</loc>`);
    }
  });

  it('asserts every <url> element has a <lastmod> matching 2026-10-31', () => {
    const sitemap = fs.readFileSync(PUBLIC_SITEMAP, 'utf8');

    const urlMatches = sitemap.match(/<url>[\s\S]*?<\/url>/g) || [];
    expect(urlMatches.length).toBeGreaterThan(0);

    const expectedTotal = 7 + LISTED_TOOLS.length + toolVariants.length;
    expect(urlMatches.length).toBe(expectedTotal);

    for (const urlBlock of urlMatches) {
      expect(urlBlock).toContain('<lastmod>2026-10-31</lastmod>');
    }
  });
});
