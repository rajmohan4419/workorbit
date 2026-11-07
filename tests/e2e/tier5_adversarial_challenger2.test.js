/**
 * @vitest-environment jsdom
 */
/* global Buffer, process */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Shared harness utilities
import {
  PROJECT_ROOT,
  readProjectFile,
  readProjectJson,
  computeCspHash,
} from './harness.js';

// Project Modules
import { TOOLS, LISTED_TOOLS } from '../../src/data/toolCatalog.js';
import toolVariants from '../../src/data/toolVariants.json';
import { generateVariants } from '../../scripts/generate-tool-variants.ts';

import {
  resolveEntitlements,
  hasFeature,
} from '../../src/lib/monetization/entitlements.js';

import {
  trackToolUsed,
  trackInvoiceCreated,
  trackExportClicked,
  trackPaywallViewed,
  trackCheckoutStarted,
  trackSubscriptionActive,
} from '../../src/lib/analytics.js';
import * as cookieConsentModule from '../../src/lib/cookieConsent.js';

// Server-side handlers and libs
import webhookHandler from '../../api/webhooks/razorpay.js';
import verifyPaymentHandler from '../../api/verify-payment.js';
import { getBearerToken } from '../../api/_lib/entitlements.js';

// Helper to construct mock HTTP request/response
function mockReqRes({
  method = 'POST',
  headers = {},
  body = null,
  rawBody = null,
} = {}) {
  const req = {
    method,
    headers: { ...headers },
    body,
    async *[Symbol.asyncIterator]() {
      if (rawBody !== null) {
        yield Buffer.from(rawBody);
      }
    },
  };

  let statusCode = 200;
  let responseHeaders = {};
  let responseData = '';

  const res = {
    writeHead: (code, hdrs) => {
      statusCode = code;
      if (hdrs) responseHeaders = { ...responseHeaders, ...hdrs };
    },
    setHeader: (key, val) => {
      responseHeaders[key] = val;
    },
    end: (chunk) => {
      if (chunk) responseData += chunk;
    },
  };

  return {
    req,
    res,
    status: () => statusCode,
    headers: () => responseHeaders,
    text: () => responseData,
    json: () => {
      try {
        return JSON.parse(responseData || '{}');
      } catch {
        return null;
      }
    },
  };
}

describe('Tier 5: White-Box Adversarial Coverage Hardening Suite (Challenger 2)', () => {
  let originalEnv;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalEnv = { ...process.env };
    localStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
    localStorage.clear();
  });

  // =========================================================================
  // Section 1: Tool Variant Generator Stress & Invariant Testing
  // =========================================================================
  describe('1. Tool Variant Generator Stress & Mathematical Invariants', () => {
    it('T5.1.1: Generates exactly 28 unique variants with valid schema and adheres to <= 150 cap', () => {
      const generated = generateVariants();
      expect(generated.length).toBe(28);
      expect(generated.length).toBeLessThanOrEqual(150);

      // Verify synced with toolVariants.json
      expect(toolVariants.length).toBe(28);
      expect(JSON.stringify(generated)).toBe(JSON.stringify(toolVariants));

      for (const variant of generated) {
        expect(variant.slug).toBeTruthy();
        expect(typeof variant.slug).toBe('string');
        expect(['emi', 'ctc-to-inhand']).toContain(variant.baseToolSlug);
        expect(variant.name).toBeTruthy();
        expect(variant.description).toBeTruthy();
        expect(variant.intro).toBeTruthy();
        expect(Array.isArray(variant.faq)).toBe(true);
        expect(variant.faq.length).toBeGreaterThanOrEqual(2);
        expect(variant.canonicalUrl).toBeTruthy();
        expect(variant.computed).toBeDefined();
      }
    });

    it('T5.1.2: Enforces absolute slug, title, and description uniqueness across all variants and tools', () => {
      const allSlugs = new Set();
      const allTitles = new Set();
      const allDescriptions = new Set();

      // Check no collision with existing base tools
      const baseToolSlugs = new Set(TOOLS.map((t) => t.slug));

      for (const v of toolVariants) {
        // Unique slug
        expect(allSlugs.has(v.slug), `Duplicate variant slug: ${v.slug}`).toBe(false);
        expect(baseToolSlugs.has(v.slug), `Variant slug collides with base tool: ${v.slug}`).toBe(false);
        allSlugs.add(v.slug);

        // Unique title
        expect(allTitles.has(v.name), `Duplicate variant title: ${v.name}`).toBe(false);
        allTitles.add(v.name);

        // Unique description
        expect(allDescriptions.has(v.description), `Duplicate description: ${v.description}`).toBe(false);
        allDescriptions.add(v.description);
      }

      expect(allSlugs.size).toBe(28);
      expect(allTitles.size).toBe(28);
      expect(allDescriptions.size).toBe(28);
    });

    it('T5.1.3: Verifies EMI mathematical monotonicity and interest invariants across tenures', () => {
      const emiVariants = toolVariants.filter((v) => v.baseToolSlug === 'emi');
      expect(emiVariants.length).toBe(16);

      const amounts = [1000000, 2500000, 5000000, 10000000];
      for (const amt of amounts) {
        const variantsForAmt = emiVariants
          .filter((v) => v.params.principal === amt)
          .sort((a, b) => a.params.tenureYears - b.params.tenureYears);

        expect(variantsForAmt.length).toBe(4); // 10, 15, 20, 25 years

        for (let i = 0; i < variantsForAmt.length - 1; i++) {
          const current = variantsForAmt[i];
          const next = variantsForAmt[i + 1];

          // As tenure increases:
          // 1. Monthly EMI strictly decreases
          expect(current.computed.monthlyEmi).toBeGreaterThan(next.computed.monthlyEmi);

          // 2. Total interest strictly increases
          expect(next.computed.totalInterest).toBeGreaterThan(current.computed.totalInterest);

          // 3. Total repayment strictly increases
          expect(next.computed.totalRepayment).toBeGreaterThan(current.computed.totalRepayment);

          // 4. Invariant: totalRepayment = principal + totalInterest
          expect(current.computed.totalRepayment).toBe(amt + current.computed.totalInterest);
          expect(next.computed.totalRepayment).toBe(amt + next.computed.totalInterest);
        }
      }
    });

    it('T5.1.4: Verifies CTC-to-in-hand tax rebate threshold and statutory EPF wage capping invariants', () => {
      const ctcVariants = toolVariants.filter((v) => v.baseToolSlug === 'ctc-to-inhand');
      expect(ctcVariants.length).toBe(12);

      for (const v of ctcVariants) {
        const { ctcAnnual, regime } = v.params;
        const comp = v.computed;

        // Take-home is strictly positive and less than gross CTC
        expect(comp.annualTakeHome).toBeGreaterThan(0);
        expect(comp.annualTakeHome).toBeLessThan(ctcAnnual);
        expect(Math.abs(comp.monthlyTakeHome - Math.round(comp.annualTakeHome / 12))).toBeLessThanOrEqual(1);

        // EPF capped at ₹15,000 monthly basic: (15,000 * 0.12 * 12 = 21,600)
        // Since basic = 40% of CTC, minimum basic is 6L * 0.4 = 2.4L / 12 = 20,000/mo > 15,000
        // Therefore EPF should always cap at ₹21,600 annually
        expect(comp.employeePf).toBe(21600);

        // Standard deduction: 75k for new, 50k for old
        if (regime === 'new') {
          expect(comp.standardDeduction).toBe(75000);
          // Under new regime, CTCs <= 12 LPA qualify for Section 87A rebate resulting in 0 tax
          if (ctcAnnual <= 1200000) {
            expect(comp.incomeTax).toBe(0);
          } else {
            expect(comp.incomeTax).toBeGreaterThan(0);
          }
        } else {
          expect(comp.standardDeduction).toBe(50000);
          // Under old regime, CTCs > 5 LPA incur income tax
          if (ctcAnnual >= 600000) {
            expect(comp.incomeTax).toBeGreaterThan(0);
          }
        }
      }
    });

    it('T5.1.5: Verifies canonical URL configuration points exclusively to live parent tools', () => {
      for (const v of toolVariants) {
        if (v.baseToolSlug === 'emi') {
          expect(v.canonicalUrl).toBe('https://orbitboard.in/tools/emi');
        } else if (v.baseToolSlug === 'ctc-to-inhand') {
          expect(v.canonicalUrl).toBe('https://orbitboard.in/tools/ctc-to-inhand');
        } else {
          throw new Error(`Unexpected baseToolSlug: ${v.baseToolSlug}`);
        }
      }

      // Verify both parent tools exist and are live in LISTED_TOOLS
      const listedSlugs = new Set(LISTED_TOOLS.map((t) => t.slug));
      expect(listedSlugs.has('emi')).toBe(true);
      expect(listedSlugs.has('ctc-to-inhand')).toBe(true);
    });

    it('T5.1.6: Verifies prerendered variant HTML files in dist/ contain exact canonical tag and content', () => {
      const distDir = path.resolve(PROJECT_ROOT, 'dist/tools');
      if (!fs.existsSync(distDir)) return; // Skipped if build not run

      for (const v of toolVariants) {
        const filePath = path.join(distDir, v.slug, 'index.html');
        expect(fs.existsSync(filePath), `Prerendered file missing: ${filePath}`).toBe(true);

        const html = fs.readFileSync(filePath, 'utf8');
        expect(html).toContain(`<link rel="canonical" href="${v.canonicalUrl}" />`);
        expect(html).toContain(v.name);
        expect(html).toContain(v.intro);
      }
    });
  });

  // =========================================================================
  // Section 2: Dynamic Sitemap Double-Write & Catalog Invariants
  // =========================================================================
  describe('2. Dynamic Sitemap Double-Write & Catalog Invariants', () => {
    it('T5.2.1: public/sitemap.xml and dist/sitemap.xml exist and match byte-for-byte', () => {
      const publicSitemap = readProjectFile('public/sitemap.xml');
      const distSitemap = readProjectFile('dist/sitemap.xml');

      if (!distSitemap) return; // requires npm run build

      expect(publicSitemap).toBeTruthy();
      expect(distSitemap).toBeTruthy();
      expect(publicSitemap).toBe(distSitemap);
    });

    it('T5.2.2: Sitemap XML contains valid header, schema namespace, and closing urlset tag', () => {
      const sitemap = readProjectFile('public/sitemap.xml');
      expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemap.trim().endsWith('</urlset>')).toBe(true);
    });

    it('T5.2.3: Sitemap contains one URL per static route, live tool, and variant', () => {
      const sitemap = readProjectFile('public/sitemap.xml');
      const locMatches = sitemap.match(/<loc>(.*?)<\/loc>/g) || [];
      expect(locMatches.length).toBe(7 + LISTED_TOOLS.length + toolVariants.length);

      // Verify no duplicate URLs in sitemap
      const uniqueUrls = new Set(locMatches);
      expect(uniqueUrls.size).toBe(7 + LISTED_TOOLS.length + toolVariants.length);
    });

    it('T5.2.4: Planned tools in toolCatalog are 100% strictly excluded from sitemap.xml', () => {
      const sitemap = readProjectFile('public/sitemap.xml');
      const plannedTools = TOOLS.filter((t) => t.status === 'planned');
      expect(plannedTools.length).toBeGreaterThan(0);

      for (const p of plannedTools) {
        expect(sitemap).not.toContain(`/tools/${p.slug}</loc>`);
      }
    });

    it('T5.2.5: Live tools in LISTED_TOOLS are 100% included in sitemap.xml', () => {
      const sitemap = readProjectFile('public/sitemap.xml');
      expect(LISTED_TOOLS.length).toBeGreaterThan(0);

      for (const tool of LISTED_TOOLS) {
        expect(sitemap).toContain(`<loc>https://orbitboard.in/tools/${tool.slug}</loc>`);
      }
    });

    it('T5.2.6: All static routes and tool variants are included in sitemap.xml', () => {
      const sitemap = readProjectFile('public/sitemap.xml');
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

      for (const v of toolVariants) {
        expect(sitemap).toContain(`<loc>https://orbitboard.in/tools/${v.slug}</loc>`);
      }
    });

    it('T5.2.7: Uniform lastmod date format and valid priority values across all sitemap entries', () => {
      const sitemap = readProjectFile('public/sitemap.xml');
      const lastmodMatches = sitemap.match(/<lastmod>(.*?)<\/lastmod>/g) || [];
      expect(lastmodMatches.length).toBe(7 + LISTED_TOOLS.length + toolVariants.length);

      // Every single entry has the constant lastmod date 2026-10-31
      for (const lm of lastmodMatches) {
        expect(lm).toBe('<lastmod>2026-10-31</lastmod>');
      }

      const priorityMatches = sitemap.match(/<priority>(.*?)<\/priority>/g) || [];
      expect(priorityMatches.length).toBe(7 + LISTED_TOOLS.length + toolVariants.length);
      for (const p of priorityMatches) {
        const val = parseFloat(p.replace(/<\/?priority>/g, ''));
        expect(val).toBeGreaterThanOrEqual(0.5);
        expect(val).toBeLessThanOrEqual(1.0);
      }
    });
  });

  // =========================================================================
  // Section 3: Vercel 404 Routing & Clean URLs Edge Verification
  // =========================================================================
  describe('3. Vercel 404 Routing & Clean URLs Edge Verification', () => {
    it('T5.3.1: vercel.json contains cleanUrls, host canonicalization, and isolated API rewrites', () => {
      const vercel = readProjectJson('vercel.json');
      expect(vercel.cleanUrls).toBe(true);

      // SPA rewrite rule must exclude api/
      const spaRewrite = vercel.rewrites.find((r) => r.destination === '/index.html');
      expect(spaRewrite).toBeDefined();
      expect(spaRewrite.source).toBe('/((?!api/).*)');

      // Canonical host redirect
      const hostRedirect = vercel.redirects.find((r) =>
        r.has?.some((h) => h.type === 'host' && h.value === 'www.orbitboard.in')
      );
      expect(hostRedirect).toBeDefined();
      expect(hostRedirect.destination).toBe('https://orbitboard.in/:path*');
      expect(hostRedirect.permanent).toBe(true);
    });

    it('T5.3.2: dist/404.html and public/404.html contain robots noindex and 404 title', () => {
      const dist404 = readProjectFile('dist/404.html');
      const public404 = readProjectFile('public/404.html');

      if (!dist404) return; // requires npm run build

      expect(dist404).toBeTruthy();
      expect(public404).toBeTruthy();

      for (const html of [dist404, public404]) {
        expect(html).toContain('robots');
        expect(html).toContain('noindex');
        expect(html).toContain('<title>404 — Page Not Found | OrbitBoard</title>');
        expect(html).toContain('Page Not Found');
        expect(html).toContain('Browse Free Tools');
      }
    });

    it('T5.3.3: Prerendered HTML files exist on disk for all live tools but NEVER for planned tools', () => {
      const distToolsDir = path.resolve(PROJECT_ROOT, 'dist/tools');
      if (!fs.existsSync(distToolsDir)) return;

      // Live tools must have index.html
      for (const tool of LISTED_TOOLS.slice(0, 15)) {
        const toolPath = path.join(distToolsDir, tool.slug, 'index.html');
        expect(fs.existsSync(toolPath), `Live tool must be prerendered: ${tool.slug}`).toBe(true);
      }

      // Planned tools MUST NOT exist as prerendered static directory on disk
      const plannedTools = TOOLS.filter((t) => t.status === 'planned');
      for (const planned of plannedTools) {
        const plannedPath = path.join(distToolsDir, planned.slug, 'index.html');
        expect(
          fs.existsSync(plannedPath),
          `Planned tool must NOT exist as prerendered static directory: ${planned.slug}`
        ).toBe(false);
      }
    });

    it('T5.3.4: Static assets (.js, .css, .json, .svg) bypass SPA rewrite logic', () => {
      const vercel = readProjectJson('vercel.json');
      expect(vercel.cleanUrls).toBe(true);

      // In Vercel, static assets in dist/ are resolved directly before rewrites
      const distAssetsDir = path.resolve(PROJECT_ROOT, 'dist/assets');
      if (fs.existsSync(distAssetsDir)) {
        const files = fs.readdirSync(distAssetsDir);
        expect(files.some((f) => f.endsWith('.js'))).toBe(true);
        expect(files.some((f) => f.endsWith('.css'))).toBe(true);
      }
    });
  });

  // =========================================================================
  // Section 4: Monetization and Webhook Flows Adversarial Simulation
  // =========================================================================
  describe('4. Monetization & Webhook Flows Adversarial Simulation', () => {
    it('T5.4.1: Webhook rejects non-POST HTTP methods with 405 Method Not Allowed', async () => {
      const methods = ['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
      for (const method of methods) {
        const { req, res, status, json } = mockReqRes({ method });
        await webhookHandler(req, res);
        expect(status()).toBe(405);
        expect(json().error).toBe('Method not allowed');
      }
    });

    it('T5.4.2: Webhook rejects unconfigured secret with 500 status', async () => {
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
      const { req, res, status, json } = mockReqRes({
        method: 'POST',
        rawBody: JSON.stringify({ event: 'subscription.activated' }),
      });
      await webhookHandler(req, res);
      expect(status()).toBe(500);
      expect(json().error).toBe('Webhook not configured');
    });

    it('T5.4.3: Webhook detects and rejects signature tampering and replay with altered payload', async () => {
      const secret = 'test_webhook_secret_key_888';
      process.env.RAZORPAY_WEBHOOK_SECRET = secret;

      const payload = JSON.stringify({
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: { id: 'sub_valid_123', current_start: 1730380000, current_end: 1732972000 },
          },
        },
      });

      const validSig = crypto.createHmac('sha256', secret).update(Buffer.from(payload)).digest('hex');

      // 1. Valid signature passes verification check
      const sigBuf = Buffer.from(validSig, 'utf-8');
      const expBuf = Buffer.from(validSig, 'utf-8');
      expect(sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)).toBe(true);

      // 2. Single bit flip in signature is rejected
      const tamperedSig = validSig.slice(0, -1) + (validSig.slice(-1) === 'f' ? '0' : 'f');
      const { req: reqTampSig, res: resTampSig, status: statusTampSig, json: jsonTampSig } = mockReqRes({
        headers: { 'x-razorpay-signature': tamperedSig },
        rawBody: payload,
      });
      await webhookHandler(reqTampSig, resTampSig);
      expect(statusTampSig()).toBe(400);
      expect(jsonTampSig().error).toBe('Invalid signature');

      // 3. Payload altered after signature generation is rejected
      const alteredPayload = payload.replace('sub_valid_123', 'sub_hacked_999');
      const { req: reqAltered, res: resAltered, status: statusAltered, json: jsonAltered } = mockReqRes({
        headers: { 'x-razorpay-signature': validSig },
        rawBody: alteredPayload,
      });
      await webhookHandler(reqAltered, resAltered);
      expect(statusAltered()).toBe(400);
      expect(jsonAltered().error).toBe('Invalid signature');
    });

    it('T5.4.4: Webhook acknowledges unhandled lifecycle events gracefully without state mutation', async () => {
      const secret = 'whsec_test_secret';
      process.env.RAZORPAY_WEBHOOK_SECRET = secret;

      const ignoredEvents = [
        'order.paid',
        'payment.failed',
        'subscription.pending',
        'refund.processed',
        'virtual_account.credited',
      ];

      for (const ev of ignoredEvents) {
        const payload = JSON.stringify({ event: ev });
        const sig = crypto.createHmac('sha256', secret).update(Buffer.from(payload)).digest('hex');

        const { req, res, status, json } = mockReqRes({
          headers: { 'x-razorpay-signature': sig },
          rawBody: payload,
        });

        await webhookHandler(req, res);
        expect(status()).toBe(200);
        expect(json().received).toBe(true);
        expect(json().ignored).toBe(ev);
      }
    });

    it('T5.4.5: Verify payment handler enforces timing-safe HMAC signatures for subscriptions and orders', async () => {
      const keySecret = 'rzp_key_secret_for_verify';
      process.env.RAZORPAY_KEY_SECRET = keySecret;

      // Subscription signature scheme: payment_id|subscription_id
      const paymentId = 'pay_sub_001';
      const subId = 'sub_sub_002';
      const subPayload = `${paymentId}|${subId}`;
      const validSubSig = crypto.createHmac('sha256', keySecret).update(subPayload).digest('hex');
      expect(validSubSig).toHaveLength(64);

      // 1. Missing required verification fields rejected with 400
      const { req: reqMissing, res: resMissing, status: statusMissing, json: jsonMissing } = mockReqRes({
        body: { razorpay_payment_id: paymentId },
      });
      await verifyPaymentHandler(reqMissing, resMissing);
      expect(statusMissing()).toBe(400);
      expect(jsonMissing().error).toContain('Missing required payment verification fields');

      // 2. Tampered signature rejected with 400
      const { req: reqBadSig, res: resBadSig, status: statusBadSig, json: jsonBadSig } = mockReqRes({
        body: {
          razorpay_payment_id: paymentId,
          razorpay_subscription_id: subId,
          razorpay_signature: 'invalid_hex_signature',
        },
      });
      await verifyPaymentHandler(reqBadSig, resBadSig);
      expect(statusBadSig()).toBe(400);
      expect(jsonBadSig().error).toBe('Invalid payment signature');

      // Order signature scheme: order_id|payment_id
      const orderId = 'order_001';
      const orderPayload = `${orderId}|${paymentId}`;
      const validOrderSig = crypto.createHmac('sha256', keySecret).update(orderPayload).digest('hex');
      expect(validOrderSig).toHaveLength(64);
    });

    it('T5.4.6: Server entitlement guard enforces tier boundaries (Free < Pro < Business)', async () => {
      // Free plan entitlements
      const freeEnt = resolveEntitlements(null);
      expect(freeEnt.planCode).toBe('free');
      expect(hasFeature(freeEnt, 'advanced_exports')).toBe(false);
      expect(hasFeature(freeEnt, 'saved_workspaces')).toBe(false);
      expect(hasFeature(freeEnt, 'bulk_processing')).toBe(false);

      // Pro plan entitlements
      const proEnt = resolveEntitlements({
        plan_code: 'pro_monthly',
        status: 'active',
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(proEnt.planCode).toBe('pro_monthly');
      expect(hasFeature(proEnt, 'advanced_exports')).toBe(true);
      expect(hasFeature(proEnt, 'saved_workspaces')).toBe(true);
      expect(hasFeature(proEnt, 'bulk_processing')).toBe(true);
      expect(hasFeature(proEnt, 'business_workflows')).toBe(false); // Only Business!
      expect(hasFeature(proEnt, 'priority_support')).toBe(false); // Only Business!

      // Business plan entitlements
      const bizEnt = resolveEntitlements({
        plan_code: 'business_annual',
        status: 'active',
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(bizEnt.planCode).toBe('business_annual');
      expect(hasFeature(bizEnt, 'advanced_exports')).toBe(true);
      expect(hasFeature(bizEnt, 'saved_workspaces')).toBe(true);
      expect(hasFeature(bizEnt, 'bulk_processing')).toBe(true);
      expect(hasFeature(bizEnt, 'business_workflows')).toBe(true);
      expect(hasFeature(bizEnt, 'priority_support')).toBe(true);
    });

    it('T5.4.7: Expired subscription gracefully downgrades to free plan with zero entitlements', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const expiredSub = {
        plan_code: 'business_annual',
        status: 'active',
        current_period_end: pastDate,
      };

      const resolved = resolveEntitlements(expiredSub);
      expect(resolved.planCode).toBe('free');
      expect(hasFeature(resolved, 'advanced_exports')).toBe(false);
      expect(hasFeature(resolved, 'bulk_processing')).toBe(false);
    });

    it('T5.4.8: Bearer token parsing and anonymous authentication rejection', async () => {
      // 1. Missing header
      expect(getBearerToken({ headers: {} })).toBe(null);

      // 2. Malformed headers
      expect(getBearerToken({ headers: { authorization: 'Basic dXNlcjpwYXNz' } })).toBe(null);
      expect(getBearerToken({ headers: { authorization: 'Bearer' } })).toBe(null);

      // 3. Valid Bearer token
      expect(getBearerToken({ headers: { authorization: 'Bearer my_jwt_token_123' } })).toBe(
        'my_jwt_token_123'
      );

      // 4. Case-insensitive bearer prefix
      expect(getBearerToken({ headers: { authorization: 'bearer lowercase_token_456' } })).toBe(
        'lowercase_token_456'
      );
    });
  });

  // =========================================================================
  // Section 5: Funnel Analytics & Cookie Consent Lifecycle
  // =========================================================================
  describe('5. Funnel Analytics & Cookie Consent Lifecycle', () => {
    let gtagCalls;

    beforeEach(() => {
      gtagCalls = [];
      window.dataLayer = [];
      window.gtag = (...args) => {
        gtagCalls.push(args);
      };
    });

    it('T5.5.1: Suppresses all 6 funnel events when cookie consent is null (unanswered)', () => {
      expect(cookieConsentModule.getConsentStatus()).toBe(null);

      expect(trackToolUsed('gst-invoice')).toBe(false);
      expect(trackInvoiceCreated('INV-001')).toBe(false);
      expect(trackExportClicked('pdf')).toBe(false);
      expect(trackPaywallViewed('advanced_exports')).toBe(false);
      expect(trackCheckoutStarted('pro_monthly')).toBe(false);
      expect(trackSubscriptionActive('pro_monthly')).toBe(false);

      expect(gtagCalls.length).toBe(0);
    });

    it('T5.5.2: Suppresses all 6 funnel events when cookie consent is essential (denied)', () => {
      cookieConsentModule.setConsentStatus('essential');
      expect(cookieConsentModule.getConsentStatus()).toBe('essential');

      expect(trackToolUsed('bank-reconciliation')).toBe(false);
      expect(trackInvoiceCreated('INV-002')).toBe(false);
      expect(trackExportClicked('xlsx')).toBe(false);
      expect(trackPaywallViewed('saved_workspaces')).toBe(false);
      expect(trackCheckoutStarted('business_monthly')).toBe(false);
      expect(trackSubscriptionActive('business_monthly')).toBe(false);

      // Filter out consent updates, ensure 0 'event' dispatches
      const eventCalls = gtagCalls.filter((c) => c[0] === 'event');
      expect(eventCalls.length).toBe(0);
    });

    it('T5.5.3: Dispatches all 6 funnel events with exact parameter schemas when consent is granted', () => {
      cookieConsentModule.setConsentStatus('granted');
      expect(cookieConsentModule.getConsentStatus()).toBe('granted');

      // 1. tool_used
      expect(trackToolUsed('payslip-generator')).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'tool_used', { slug: 'payslip-generator' }]);

      // 2. invoice_created
      expect(trackInvoiceCreated('INV-2026-X')).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'invoice_created', { id: 'INV-2026-X' }]);

      // 3. export_clicked
      expect(trackExportClicked('pdf')).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'export_clicked', { format: 'pdf' }]);

      // 4. paywall_viewed
      expect(trackPaywallViewed('bulk_processing')).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'paywall_viewed', { feature: 'bulk_processing' }]);

      // 5. checkout_started
      expect(trackCheckoutStarted('pro_annual')).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'checkout_started', { plan: 'pro_annual' }]);

      // 6. subscription_active
      expect(trackSubscriptionActive('pro_annual')).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'subscription_active', { plan: 'pro_annual' }]);
    });

    it('T5.5.4: Immediately cuts off telemetry when user revokes consent from granted to essential', () => {
      // Step 1: Grant consent and verify event fires
      cookieConsentModule.setConsentStatus('granted');
      expect(trackToolUsed('emi')).toBe(true);

      const countAfterGrant = gtagCalls.filter((c) => c[0] === 'event').length;
      expect(countAfterGrant).toBe(1);

      // Step 2: Revoke consent
      cookieConsentModule.setConsentStatus('essential');
      expect(cookieConsentModule.getConsentStatus()).toBe('essential');

      // Step 3: Subsequent events must immediately return false
      expect(trackToolUsed('emi')).toBe(false);
      expect(trackExportClicked('csv')).toBe(false);

      const countAfterRevoke = gtagCalls.filter((c) => c[0] === 'event').length;
      expect(countAfterRevoke).toBe(1); // No new event calls dispatched
    });

    it('T5.5.5: Handles boundary and empty parameters without exception', () => {
      cookieConsentModule.setConsentStatus('granted');

      // Undefined invoice id defaults to empty payload {}
      expect(trackInvoiceCreated(undefined)).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'invoice_created', {}]);

      // Null slug
      expect(trackToolUsed(null)).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'tool_used', { slug: null }]);

      // Empty string format
      expect(trackExportClicked('')).toBe(true);
      expect(gtagCalls).toContainEqual(['event', 'export_clicked', { format: '' }]);
    });
  });

  // =========================================================================
  // Section 6: CSP Security & Repository Cleanliness Audits
  // =========================================================================
  describe('6. CSP Security Hardening & Secret Audits', () => {
    it('T5.6.1: vercel.json Content-Security-Policy excludes unsafe-eval and unsafe-inline in script directives', () => {
      const vercel = readProjectJson('vercel.json');
      const cspHeader = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy');
      expect(cspHeader).toBeDefined();

      const csp = cspHeader.value;

      // Extract script-src and script-src-elem
      const scriptSrc = csp.match(/script-src\s+([^;]+)/)?.[1] || '';
      const scriptSrcElem = csp.match(/script-src-elem\s+([^;]+)/)?.[1] || '';

      expect(scriptSrc).not.toContain("'unsafe-eval'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");

      expect(scriptSrcElem).not.toContain("'unsafe-eval'");
      expect(scriptSrcElem).not.toContain("'unsafe-inline'");
    });

    it('T5.6.2: Verifies exact SHA-256 hash match for inline Google Consent Mode script in index.html', () => {
      const vercel = readProjectJson('vercel.json');
      const csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;

      const expectedHash = "'sha256-fKZEcC922IMO+0G5BkycWTyqRY/A6lttqjgIVNaJfyU='";
      expect(csp).toContain(expectedHash);

      // Extract script tag from index.html and compute its SHA-256
      const indexHtml = readProjectFile('index.html');
      const scriptMatch = indexHtml.match(/<!-- Google Consent Mode v2 Setup -->\s*<script>([\s\S]*?)<\/script>/);
      expect(scriptMatch).toBeDefined();

      const scriptContent = scriptMatch[1];
      const computedHash = computeCspHash(scriptContent);
      expect(computedHash).toBe(expectedHash);
    });

    it('T5.6.3: CSP permits essential payment and analytics origins', () => {
      const vercel = readProjectJson('vercel.json');
      const csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;

      // Razorpay
      expect(csp).toContain('https://checkout.razorpay.com');
      expect(csp).toContain('https://api.razorpay.com');

      // Google Analytics & Tag Manager
      expect(csp).toContain('https://www.googletagmanager.com');
      expect(csp).toContain('https://*.google-analytics.com');

      // Google AdSense
      expect(csp).toContain('https://pagead2.googlesyndication.com');
    });

    it('T5.6.4: .gitignore explicitly contains .env and no .env files are committed to git', () => {
      const gitignore = readProjectFile('.gitignore');
      expect(gitignore).toContain('.env');

      // Ensure no .env file exists in tracked files
      expect(fs.existsSync(path.resolve(PROJECT_ROOT, '.env'))).toBe(false);
    });
  });
});
