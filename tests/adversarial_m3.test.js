import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOOLS, LISTED_TOOLS } from '../src/data/toolCatalog.js';
import toolVariants from '../src/data/toolVariants.json';
import { generateVariants } from '../scripts/generate-tool-variants.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const DIST_EXISTS = fs.existsSync(distDir);

describe('Milestone 3 Adversarial Verification & Mathematical Oracle Suite', () => {
  // =========================================================================
  // 1. Variant Generator & Catalog Integrity
  // =========================================================================
  describe('Variant Generator & Catalog Integrity', () => {
    it('M3.1: generateVariants() generates exactly 28 variants (capped <= 150)', () => {
      const generated = generateVariants();
      expect(generated.length).toBe(28);
      expect(generated.length).toBeLessThanOrEqual(150);
      expect(toolVariants.length).toBe(28);
      expect(toolVariants.length).toBeLessThanOrEqual(150);
    });

    it('M3.2: Contains exactly 16 EMI variants and 12 CTC variants', () => {
      const emiVariants = toolVariants.filter((v) => v.baseToolSlug === 'emi');
      const ctcVariants = toolVariants.filter((v) => v.baseToolSlug === 'ctc-to-inhand');
      expect(emiVariants.length).toBe(16);
      expect(ctcVariants.length).toBe(12);
      expect(emiVariants.length + ctcVariants.length).toBe(28);
    });

    it('M3.3: All 28 variant slugs are distinct and do not collide with base tools in TOOLS', () => {
      const baseSlugs = new Set(TOOLS.map((t) => t.slug));
      const variantSlugs = new Set();

      for (const variant of toolVariants) {
        expect(variant.slug).toBeTruthy();
        expect(typeof variant.slug).toBe('string');
        expect(/^[a-z0-9-]+$/.test(variant.slug)).toBe(true);
        expect(variantSlugs.has(variant.slug)).toBe(false);
        expect(baseSlugs.has(variant.slug)).toBe(false);
        variantSlugs.add(variant.slug);
      }
      expect(variantSlugs.size).toBe(28);
    });

    it('M3.4: Base tools "emi" and "ctc-to-inhand" exist in toolCatalog and are live', () => {
      const emi = TOOLS.find((t) => t.slug === 'emi');
      const ctc = TOOLS.find((t) => t.slug === 'ctc-to-inhand');
      expect(emi).toBeDefined();
      expect(emi.status).toBe('live');
      expect(ctc).toBeDefined();
      expect(ctc.status).toBe('live');
    });

    it('M3.5: All variants have complete metadata schema without undefined, null, or NaN', () => {
      for (const v of toolVariants) {
        expect(v.slug).toBeTruthy();
        expect(['emi', 'ctc-to-inhand']).toContain(v.baseToolSlug);
        expect(v.name).toBeTruthy();
        expect(['Finance', 'Career']).toContain(v.category);
        expect(v.description).toBeTruthy();
        expect(v.params).toBeDefined();
        expect(v.intro).toBeTruthy();
        expect(Array.isArray(v.faq)).toBe(true);
        expect(v.faq.length).toBe(4);
        for (const [q, a] of v.faq) {
          expect(q).toBeTruthy();
          expect(a).toBeTruthy();
          expect(q).not.toContain('undefined');
          expect(q).not.toContain('NaN');
          expect(a).not.toContain('undefined');
          expect(a).not.toContain('NaN');
        }
        expect(v.canonicalUrl).toBeTruthy();
        expect(v.computed).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 2. Mathematical Validation: EMI Variants (16 Variants)
  // =========================================================================
  describe('Mathematical Validation: EMI Variants (16 Variants)', () => {
    const benchmarkRate = 8.5; // 8.5% annual interest

    it('M3.6: Exhaustively validates EMI formula against standard mathematical oracle for all 16 variants', () => {
      const emiVariants = toolVariants.filter((v) => v.baseToolSlug === 'emi');
      expect(emiVariants.length).toBe(16);

      const expectedAmounts = [1000000, 2500000, 5000000, 10000000];
      const expectedTenures = [10, 15, 20, 25];

      for (const amt of expectedAmounts) {
        for (const tenure of expectedTenures) {
          const variant = emiVariants.find(
            (v) => v.params.principal === amt && v.params.tenureYears === tenure
          );
          expect(variant).toBeDefined();

          // Oracle Calculation
          const P = amt;
          const r = benchmarkRate / 1200; // Monthly interest rate
          const n = tenure * 12; // Total monthly installments
          const rawEmi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          const expectedMonthlyEmi = Math.round(rawEmi);
          const expectedRepayment = expectedMonthlyEmi * n;
          const expectedInterest = expectedRepayment - P;

          // Compare with variant.computed
          expect(variant.computed.monthlyEmi).toBe(expectedMonthlyEmi);
          expect(variant.computed.totalInterest).toBe(expectedInterest);
          expect(variant.computed.totalRepayment).toBe(expectedRepayment);
          expect(variant.computed.tenureMonths).toBe(n);

          // Verify formatINR consistency in intro and FAQ
          const formattedEmi = expectedMonthlyEmi.toLocaleString('en-IN');
          const formattedInterest = expectedInterest.toLocaleString('en-IN');
          const formattedRepayment = expectedRepayment.toLocaleString('en-IN');

          expect(variant.intro).toContain(`₹${formattedEmi}`);
          expect(variant.intro).toContain(`₹${formattedInterest}`);
          expect(variant.intro).toContain(`₹${formattedRepayment}`);

          // FAQ item 1: monthly EMI
          expect(variant.faq[0][1]).toContain(`₹${formattedEmi}`);
          // FAQ item 2: total interest
          expect(variant.faq[1][1]).toContain(`₹${formattedInterest}`);
          // FAQ item 3: total repayment
          expect(variant.faq[2][1]).toContain(`₹${formattedRepayment}`);
        }
      }
    });

    it('M3.7: Stress-tests boundary and monotonicity properties of EMI calculation', () => {
      const emiVariants = toolVariants.filter((v) => v.baseToolSlug === 'emi');

      // 1. For a fixed principal, longer tenure MUST decrease monthly EMI and increase total interest
      for (const amt of [1000000, 2500000, 5000000, 10000000]) {
        const variantsForAmt = emiVariants
          .filter((v) => v.params.principal === amt)
          .sort((a, b) => a.params.tenureYears - b.params.tenureYears);

        for (let i = 0; i < variantsForAmt.length - 1; i++) {
          const current = variantsForAmt[i];
          const next = variantsForAmt[i + 1];

          expect(next.computed.monthlyEmi).toBeLessThan(current.computed.monthlyEmi);
          expect(next.computed.totalInterest).toBeGreaterThan(current.computed.totalInterest);
          expect(next.computed.totalRepayment).toBeGreaterThan(current.computed.totalRepayment);
        }
      }

      // 2. For a fixed tenure, higher principal MUST scale monthly EMI, interest, and repayment proportionally
      for (const tenure of [10, 15, 20, 25]) {
        const v10L = emiVariants.find((v) => v.params.principal === 1000000 && v.params.tenureYears === tenure);
        const v1Cr = emiVariants.find((v) => v.params.principal === 10000000 && v.params.tenureYears === tenure);

        // 1 Crore is exactly 10x 10 Lakh
        const ratio = v1Cr.computed.monthlyEmi / v10L.computed.monthlyEmi;
        expect(Math.abs(ratio - 10)).toBeLessThan(0.01);
      }
    });
  });

  // =========================================================================
  // 3. Mathematical Validation: CTC-to-In-Hand Variants (12 Variants)
  // =========================================================================
  describe('Mathematical Validation: CTC-to-In-Hand Variants (12 Variants)', () => {
    function oracleNewTax(taxable) {
      const slabs = [
        [400000, 0],
        [400000, 0.05],
        [400000, 0.10],
        [400000, 0.15],
        [400000, 0.20],
        [400000, 0.25],
        [Infinity, 0.30],
      ];
      let remaining = taxable;
      let tax = 0;
      for (const [limit, rate] of slabs) {
        const amount = Math.min(remaining, limit);
        if (amount <= 0) break;
        tax += amount * rate;
        remaining -= amount;
      }
      if (taxable <= 1200000) {
        tax = Math.max(0, tax - 60000);
      }
      return tax * 1.04;
    }

    function oracleOldTax(taxable) {
      const slabs = [
        [250000, 0],
        [250000, 0.05],
        [500000, 0.20],
        [Infinity, 0.30],
      ];
      let remaining = taxable;
      let tax = 0;
      for (const [limit, rate] of slabs) {
        const amount = Math.min(remaining, limit);
        if (amount <= 0) break;
        tax += amount * rate;
        remaining -= amount;
      }
      if (taxable <= 500000) {
        tax = Math.max(0, tax - 12500);
      }
      return tax * 1.04;
    }

    it('M3.8: Exhaustively validates CTC salary breakdowns against independent tax oracle for all 12 variants', () => {
      const ctcVariants = toolVariants.filter((v) => v.baseToolSlug === 'ctc-to-inhand');
      expect(ctcVariants.length).toBe(12);

      const expectedCtcs = [600000, 800000, 1000000, 1200000, 1500000, 2000000];
      const expectedRegimes = ['new', 'old'];

      for (const ctc of expectedCtcs) {
        for (const regime of expectedRegimes) {
          const variant = ctcVariants.find(
            (v) => v.params.ctcAnnual === ctc && v.params.regime === regime
          );
          expect(variant).toBeDefined();

          // Oracle Calculation
          const basic = (ctc * 40) / 100;
          const monthlyBasic = basic / 12;
          const employeePf = Math.min(monthlyBasic, 15000) * 0.12 * 12;
          const employerPf = employeePf;
          const fixedGross = ctc - employerPf;
          const stdDed = regime === 'new' ? 75000 : 50000;
          const taxable = Math.max(0, fixedGross - stdDed);
          const rawTax = regime === 'new' ? oracleNewTax(taxable) : oracleOldTax(taxable);
          const incomeTax = Math.round(rawTax);
          const pt = (fixedGross / 12 >= 25000) ? 2500 : 0;
          const rawAnnualTakeHome = Math.max(0, fixedGross - employeePf - rawTax - pt);
          const expectedAnnualTakeHome = Math.round(rawAnnualTakeHome);
          const expectedMonthlyTakeHome = Math.round(rawAnnualTakeHome / 12);

          // Assert computed values
          expect(variant.computed.annualCtc).toBe(ctc);
          expect(variant.computed.standardDeduction).toBe(stdDed);
          expect(variant.computed.employeePf).toBe(Math.round(employeePf));
          expect(variant.computed.incomeTax).toBe(incomeTax);
          expect(variant.computed.annualTakeHome).toBe(expectedAnnualTakeHome);
          expect(variant.computed.monthlyTakeHome).toBe(expectedMonthlyTakeHome);

          // Format check in intro and FAQ
          const formattedMonthly = expectedMonthlyTakeHome.toLocaleString('en-IN');
          const formattedAnnual = expectedAnnualTakeHome.toLocaleString('en-IN');

          expect(variant.intro).toContain(`₹${formattedMonthly}`);
          expect(variant.faq[0][1]).toContain(`₹${formattedMonthly}`);
          expect(variant.faq[0][1]).toContain(`₹${formattedAnnual}`);
        }
      }
    });

    it('M3.9: Validates Section 87A rebate boundary logic: 6L to 12L under New Regime has 0 tax', () => {
      const ctcVariants = toolVariants.filter((v) => v.baseToolSlug === 'ctc-to-inhand');

      // 6L, 8L, 10L, 12L under New Regime should have taxable <= 12,00,000 and thus 0 tax
      const zeroTaxVariants = [600000, 800000, 1000000, 1200000];
      for (const ctc of zeroTaxVariants) {
        const v = ctcVariants.find((x) => x.params.ctcAnnual === ctc && x.params.regime === 'new');
        expect(v.computed.incomeTax).toBe(0);
        expect(v.faq[1][1]).toContain('₹0 thanks to tax rebate provisions');
      }

      // 15L and 20L under New Regime MUST have non-zero tax
      const highTaxVariants = [1500000, 2000000];
      for (const ctc of highTaxVariants) {
        const v = ctcVariants.find((x) => x.params.ctcAnnual === ctc && x.params.regime === 'new');
        expect(v.computed.incomeTax).toBeGreaterThan(0);
        expect(v.faq[1][1]).toContain('calculated annual income tax liability');
      }
    });

    it('M3.10: Validates Old Regime tax liability: only taxable <= 5L gets rebate', () => {
      const ctcVariants = toolVariants.filter((v) => v.baseToolSlug === 'ctc-to-inhand');

      // Under Old Regime with 40% basic and capped PF:
      // Even 6L has gross 5,78,400 - std ded 50,000 = taxable 5,28,400 > 5,00,000.
      // Therefore, all CTCs from 6L to 20L under Old Regime must have non-zero tax!
      for (const ctc of [600000, 800000, 1000000, 1200000, 1500000, 2000000]) {
        const v = ctcVariants.find((x) => x.params.ctcAnnual === ctc && x.params.regime === 'old');
        expect(v.computed.incomeTax).toBeGreaterThan(0);
        expect(v.faq[1][1]).toContain('calculated annual income tax liability');
      }
    });
  });

  // =========================================================================
  // 4. Canonical Tags Validation
  // =========================================================================
  describe('Canonical Tags Validation', () => {
    it('M3.11: Every variant canonicalUrl in toolVariants.json points strictly to base tool', () => {
      for (const v of toolVariants) {
        if (v.baseToolSlug === 'emi') {
          expect(v.canonicalUrl).toBe('https://orbitboard.in/tools/emi');
        } else if (v.baseToolSlug === 'ctc-to-inhand') {
          expect(v.canonicalUrl).toBe('https://orbitboard.in/tools/ctc-to-inhand');
        } else {
          throw new Error(`Unexpected baseToolSlug: ${v.baseToolSlug}`);
        }
      }
    });

    it('M3.12: Prerendered HTML files for all 28 variants have canonical tags pointing to base tools', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      for (const v of toolVariants) {
        const htmlPath = path.join(distDir, 'tools', v.slug, 'index.html');
        expect(fs.existsSync(htmlPath)).toBe(true);
        const html = fs.readFileSync(htmlPath, 'utf8');

        const canonicalRegex = /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i;
        const match = html.match(canonicalRegex);
        expect(match).not.toBeNull();
        expect(match[1]).toBe(v.canonicalUrl);

        // Ensure there is only ONE canonical tag in the file
        const matches = html.match(/<link\s+rel="canonical"/gi);
        expect(matches.length).toBe(1);
      }
    });

    it('M3.13: Base tools "emi" and "ctc-to-inhand" have self-pointing canonical tags', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      const emiHtml = fs.readFileSync(path.join(distDir, 'tools', 'emi', 'index.html'), 'utf8');
      const ctcHtml = fs.readFileSync(path.join(distDir, 'tools', 'ctc-to-inhand', 'index.html'), 'utf8');

      expect(emiHtml).toContain('<link rel="canonical" href="https://orbitboard.in/tools/emi" />');
      expect(ctcHtml).toContain('<link rel="canonical" href="https://orbitboard.in/tools/ctc-to-inhand" />');
    });
  });

  // =========================================================================
  // 5. Prerendered HTML Files & 404 Routing Validation
  // =========================================================================
  describe('Prerendered HTML Files & 404 Routing Validation', () => {
    it('M3.14: All 110 prerendered HTML files exist and are non-empty', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      // 7 static routes
      const staticFiles = [
        'index.html',
        'tools/index.html',
        'about/index.html',
        'contact/index.html',
        'privacy/index.html',
        'terms/index.html',
        'pricing/index.html',
      ];

      for (const rel of staticFiles) {
        const full = path.join(distDir, rel);
        expect(fs.existsSync(full)).toBe(true);
        const stats = fs.statSync(full);
        expect(stats.size).toBeGreaterThan(1000);
      }

      // 75 live tools
      expect(LISTED_TOOLS.length).toBe(75);
      for (const tool of LISTED_TOOLS) {
        const full = path.join(distDir, 'tools', tool.slug, 'index.html');
        expect(fs.existsSync(full)).toBe(true);
        const stats = fs.statSync(full);
        expect(stats.size).toBeGreaterThan(1000);
      }

      // 28 variants
      expect(toolVariants.length).toBe(28);
      for (const v of toolVariants) {
        const full = path.join(distDir, 'tools', v.slug, 'index.html');
        expect(fs.existsSync(full)).toBe(true);
        const stats = fs.statSync(full);
        expect(stats.size).toBeGreaterThan(1000);
      }
    });

    it('M3.15: Every one of the 110 HTML files contains title, description, and canonical tags', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      const allPaths = [];

      // 7 static
      allPaths.push(path.join(distDir, 'index.html'));
      allPaths.push(path.join(distDir, 'tools', 'index.html'));
      allPaths.push(path.join(distDir, 'about', 'index.html'));
      allPaths.push(path.join(distDir, 'contact', 'index.html'));
      allPaths.push(path.join(distDir, 'privacy', 'index.html'));
      allPaths.push(path.join(distDir, 'terms', 'index.html'));
      allPaths.push(path.join(distDir, 'pricing', 'index.html'));

      // 75 live tools
      for (const tool of LISTED_TOOLS) {
        allPaths.push(path.join(distDir, 'tools', tool.slug, 'index.html'));
      }

      // 28 variants
      for (const v of toolVariants) {
        allPaths.push(path.join(distDir, 'tools', v.slug, 'index.html'));
      }

      expect(allPaths.length).toBe(110);

      for (const filePath of allPaths) {
        const html = fs.readFileSync(filePath, 'utf8');

        // Check <title>
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        expect(titleMatch).not.toBeNull();
        expect(titleMatch[1].trim().length).toBeGreaterThan(5);
        expect(titleMatch[1]).not.toContain('undefined');
        expect(titleMatch[1]).not.toContain('NaN');

        // Check <meta name="description" content="..." />
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"\s*\/?>/);
        expect(descMatch).not.toBeNull();
        expect(descMatch[1].trim().length).toBeGreaterThan(15);
        expect(descMatch[1]).not.toContain('undefined');
        expect(descMatch[1]).not.toContain('NaN');

        // Check <link rel="canonical" href="..." />
        const canonMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/);
        expect(canonMatch).not.toBeNull();
        expect(canonMatch[1].startsWith('https://orbitboard.in')).toBe(true);

        // Check OpenGraph and Twitter meta tags
        expect(html).toContain('property="og:title"');
        expect(html).toContain('property="og:description"');
        expect(html).toContain('name="twitter:title"');
        expect(html).toContain('name="twitter:description"');
      }
    });

    it('M3.16: dist/404.html and public/404.html contain robots noindex and correct 404 title', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      const dist404 = fs.readFileSync(path.join(distDir, '404.html'), 'utf8');
      const public404 = fs.readFileSync(path.join(publicDir, '404.html'), 'utf8');

      for (const html of [dist404, public404]) {
        expect(html).toContain('<meta name="robots" content="noindex, follow" />');
        expect(html).toContain('<title>404 — Page Not Found | OrbitBoard</title>');
        expect(html).toContain('Page Not Found');
        expect(html).toContain('/tools');
        expect(html).toContain('/');
      }
    });
  });

  // =========================================================================
  // 6. Dynamic Sitemap XML Validation
  // =========================================================================
  describe('Dynamic Sitemap XML Validation', () => {
    it('M3.17: public/sitemap.xml and dist/sitemap.xml exist and are identical', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      const publicSitemap = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8');
      const distSitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');

      expect(publicSitemap.length).toBeGreaterThan(1000);
      expect(publicSitemap).toBe(distSitemap);
    });

    it('M3.18: Contains exactly 110 URLs with uniform lastmod 2026-10-31', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');

      const locMatches = sitemap.match(/<loc>/g) || [];
      const lastmodMatches = sitemap.match(/<lastmod>2026-10-31<\/lastmod>/g) || [];

      expect(locMatches.length).toBe(110);
      expect(lastmodMatches.length).toBe(110);
    });

    it('M3.19: All 7 static routes, 75 live tools, and 28 variants are present in sitemap.xml', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');

      // 7 static routes
      const staticUrls = [
        'https://orbitboard.in/',
        'https://orbitboard.in/tools',
        'https://orbitboard.in/about',
        'https://orbitboard.in/contact',
        'https://orbitboard.in/privacy',
        'https://orbitboard.in/terms',
        'https://orbitboard.in/pricing',
      ];
      for (const u of staticUrls) {
        expect(sitemap).toContain(`<loc>${u}</loc>`);
      }

      // 75 live tools
      for (const tool of LISTED_TOOLS) {
        expect(sitemap).toContain(`<loc>https://orbitboard.in/tools/${tool.slug}</loc>`);
      }

      // 28 variants
      for (const v of toolVariants) {
        expect(sitemap).toContain(`<loc>https://orbitboard.in/tools/${v.slug}</loc>`);
      }
    });

    it('M3.20: Planned tools from TOOLS are strictly excluded from sitemap.xml', () => {
      if (!DIST_EXISTS) return; // requires npm run build
      const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
      const plannedTools = TOOLS.filter((t) => t.status === 'planned');

      expect(plannedTools.length).toBeGreaterThan(0);
      for (const p of plannedTools) {
        expect(sitemap).not.toContain(`/tools/${p.slug}</loc>`);
      }
    });
  });

  // =========================================================================
  // 7. Vercel Configuration & Clean URLs
  // =========================================================================
  describe('Vercel Configuration & Clean URLs', () => {
    it('M3.21: vercel.json includes cleanUrls: true and SPA rewrites for non-api routes', () => {
      const raw = fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8');
      const vercel = JSON.parse(raw);

      expect(vercel.cleanUrls).toBe(true);
      expect(vercel.rewrites).toBeDefined();

      const spaRewrite = vercel.rewrites.find((r) => r.destination === '/index.html');
      expect(spaRewrite).toBeDefined();
      expect(spaRewrite.source).toBe('/((?!api/).*)');
    });
  });

  // =========================================================================
  // 8. Structured Data (JSON-LD) & Content Uniqueness
  // =========================================================================
  describe('Structured Data (JSON-LD) & Content Uniqueness', () => {
    it('M3.22: All JSON-LD script blocks across all 110 HTML files parse as valid JSON without exception', () => {
      const allPaths = [];
      allPaths.push(path.join(distDir, 'index.html'));
      allPaths.push(path.join(distDir, 'tools', 'index.html'));
      allPaths.push(path.join(distDir, 'about', 'index.html'));
      allPaths.push(path.join(distDir, 'contact', 'index.html'));
      allPaths.push(path.join(distDir, 'privacy', 'index.html'));
      allPaths.push(path.join(distDir, 'terms', 'index.html'));
      allPaths.push(path.join(distDir, 'pricing', 'index.html'));

      for (const tool of LISTED_TOOLS) {
        allPaths.push(path.join(distDir, 'tools', tool.slug, 'index.html'));
      }
      for (const v of toolVariants) {
        allPaths.push(path.join(distDir, 'tools', v.slug, 'index.html'));
      }

      for (const filePath of allPaths) {
        const html = fs.readFileSync(filePath, 'utf8');
        const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
        for (const match of ldMatches) {
          const jsonText = match[1];
          expect(() => JSON.parse(jsonText)).not.toThrow();
          const parsed = JSON.parse(jsonText);
          expect(parsed['@context']).toBe('https://schema.org');
        }
      }
    });

    it('M3.23: All 28 variants have unique, parameter-derived intro copy (no duplicate intros)', () => {
      const intros = new Set();
      for (const v of toolVariants) {
        expect(intros.has(v.intro)).toBe(false);
        intros.add(v.intro);
      }
      expect(intros.size).toBe(28);
    });

    it('M3.24: All 28 variants have unique FAQ content derived from their specific parameters', () => {
      const firstFaqQuestions = new Set();
      for (const v of toolVariants) {
        const q1 = v.faq[0][0];
        expect(firstFaqQuestions.has(q1)).toBe(false);
        firstFaqQuestions.add(q1);
      }
      expect(firstFaqQuestions.size).toBe(28);
    });

    it('M3.25: Noscript fallback tags are injected into all 110 HTML files', () => {
      const allPaths = [];
      allPaths.push(path.join(distDir, 'index.html'));
      allPaths.push(path.join(distDir, 'tools', 'index.html'));
      allPaths.push(path.join(distDir, 'about', 'index.html'));
      allPaths.push(path.join(distDir, 'contact', 'index.html'));
      allPaths.push(path.join(distDir, 'privacy', 'index.html'));
      allPaths.push(path.join(distDir, 'terms', 'index.html'));
      allPaths.push(path.join(distDir, 'pricing', 'index.html'));

      for (const tool of LISTED_TOOLS) {
        allPaths.push(path.join(distDir, 'tools', tool.slug, 'index.html'));
      }
      for (const v of toolVariants) {
        allPaths.push(path.join(distDir, 'tools', v.slug, 'index.html'));
      }

      for (const filePath of allPaths) {
        const html = fs.readFileSync(filePath, 'utf8');
        expect(html).toContain('<noscript>');
        expect(html).toContain('</noscript>');
      }
    });
  });
});
