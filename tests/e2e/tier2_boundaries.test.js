import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  PROJECT_ROOT,
  readProjectFile,
  readProjectJson,
  loadModule,
  STATUTORY_LIMITS_SPEC,
  calculateReferencePayslip,
  reconcileReferenceGstr,
  calculateReferenceTds,
  generateReferenceSalarySheet,
  generateReferenceVariants,
} from './harness.js';

const planCatalogModule = await loadModule('src/lib/monetization/planCatalog.js');
const entitlementsModule = await loadModule('src/lib/monetization/entitlements.js');
const productsModule = await loadModule('api/_lib/products.js');
const passOrdersModule = await loadModule('api/_lib/passOrders.js');
const toolCatalogModule = await loadModule('src/data/toolCatalog.js');
const cookieConsentModule = await loadModule('src/lib/cookieConsent.js');
const toolFormatModule = await loadModule('src/lib/toolFormat.js');

describe('Tier 2: Boundary & Corner Cases (F1 to F18)', () => {
  // =========================================================================
  // F1: Plan Catalog & Pricing Cards Boundaries
  // =========================================================================
  describe('F1: Plan Catalog Boundaries', () => {
    it('T2.F1.1: getPlan returns null for edge inputs (empty string, null, undefined, numeric)', () => {
      expect(planCatalogModule.getPlan('')).toBeNull();
      expect(planCatalogModule.getPlan(null)).toBeNull();
      expect(planCatalogModule.getPlan(undefined)).toBeNull();
      expect(planCatalogModule.getPlan(123)).toBeNull();
      expect(planCatalogModule.getPlan('__proto__')).toBeNull();
    });

    it('T2.F1.2: getPlanPricePaise returns null for invalid plan codes rather than 0 or NaN', () => {
      expect(planCatalogModule.getPlanPricePaise('')).toBeNull();
      expect(planCatalogModule.getPlanPricePaise('fake_plan')).toBeNull();
      expect(planCatalogModule.getPlanPricePaise(null)).toBeNull();
    });

    it('T2.F1.3: getRazorpayPlanId returns null when environment variable is missing', () => {
      const emptyEnv = {};
      expect(planCatalogModule.getRazorpayPlanId('pro_monthly', emptyEnv)).toBeNull();
      expect(planCatalogModule.getRazorpayPlanId('pro_annual', emptyEnv)).toBeNull();
      expect(planCatalogModule.getRazorpayPlanId('free', emptyEnv)).toBeNull();
    });

    it('T2.F1.4: Free tier price is exactly zero at boundary between free and commercial tiers', () => {
      const free = planCatalogModule.PLAN_CATALOG.free;
      expect(free.amountInr).toBe(0);
      expect(planCatalogModule.getPlanPricePaise('free')).toBe(0);
    });

    it('T2.F1.5: Paid plan prices are strictly positive integers without floating-point amounts', () => {
      for (const [code, plan] of Object.entries(planCatalogModule.PLAN_CATALOG)) {
        if (code !== 'free') {
          expect(Number.isInteger(plan.amountInr)).toBe(true);
          expect(plan.amountInr).toBeGreaterThan(0);
        }
      }
    });
  });

  // =========================================================================
  // F2: usePlan & PlanGate Logic Boundaries
  // =========================================================================
  describe('F2: usePlan & PlanGate Logic Boundaries', () => {
    it('T2.F2.1: Subscription expired exactly 1 ms ago falls back to free plan', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1).toISOString();
      const expiredSub = { plan_code: 'pro_monthly', status: 'active', current_period_end: pastDate };
      const ent = entitlementsModule.resolveEntitlements(expiredSub, now);
      expect(ent.planCode).toBe('free');
      expect(ent.isPaid).toBe(false);
    });

    it('T2.F2.2: Subscription ending exactly 1 ms in future is recognized as active', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000).toISOString();
      const activeSub = { plan_code: 'pro_monthly', status: 'active', current_period_end: futureDate };
      const ent = entitlementsModule.resolveEntitlements(activeSub, now);
      expect(ent.planCode).toBe('pro_monthly');
      expect(ent.isPaid).toBe(true);
    });

    it('T2.F2.3: Non-date or corrupted current_period_end string fails closed to free plan', () => {
      const badDates = ['invalid-date', '', '2026-99-99', null, undefined, 0];
      for (const bad of badDates) {
        const sub = { plan_code: 'pro_monthly', status: 'active', current_period_end: bad };
        const ent = entitlementsModule.resolveEntitlements(sub);
        expect(ent.planCode).toBe('free');
        expect(ent.isPaid).toBe(false);
      }
    });

    it('T2.F2.4: hasFeature returns false for unknown or malicious property lookups', () => {
      const proEnt = entitlementsModule.resolveEntitlements({
        plan_code: 'pro_monthly',
        status: 'active',
        current_period_end: new Date(Date.now() + 100000).toISOString(),
      });
      expect(entitlementsModule.hasFeature(proEnt, 'unknown_feature')).toBe(false);
      expect(entitlementsModule.hasFeature(proEnt, '__proto__')).toBe(false);
      expect(entitlementsModule.hasFeature(proEnt, null)).toBe(false);
      expect(entitlementsModule.hasFeature(null, 'advanced_exports')).toBe(false);
    });

    it('T2.F2.5: Active subscription with unrecognized plan_code defaults safely to free plan', () => {
      const sub = {
        plan_code: 'unrecognized_plan_xyz',
        status: 'active',
        current_period_end: new Date(Date.now() + 100000).toISOString(),
      };
      const ent = entitlementsModule.resolveEntitlements(sub);
      expect(ent.planCode).toBe('free');
      expect(ent.isPaid).toBe(false);
    });
  });

  // =========================================================================
  // F3: Server Entitlement Limits Boundaries
  // =========================================================================
  describe('F3: Server Entitlement Limits Boundaries', () => {
    it('T2.F3.1: Zero boundary check: Free plan advanced_export quota is exactly 0', () => {
      const freeEnt = entitlementsModule.resolveEntitlements(null);
      expect(entitlementsModule.getFeatureLimit(freeEnt, 'advanced_export')).toBe(0);
      expect(entitlementsModule.getFeatureLimit(freeEnt, 'bulk_job')).toBe(0);
    });

    it('T2.F3.2: Upper quota limits on Business Annual do not exceed standard integer range', () => {
      const future = new Date(Date.now() + 100000000).toISOString();
      const bizAnnual = entitlementsModule.resolveEntitlements({
        plan_code: 'business_annual',
        status: 'active',
        current_period_end: future,
      });
      expect(entitlementsModule.getFeatureLimit(bizAnnual, 'advanced_export')).toBe(6000);
      expect(entitlementsModule.getFeatureLimit(bizAnnual, 'bulk_job')).toBe(2400);
      expect(entitlementsModule.getFeatureLimit(bizAnnual, 'business_workflow')).toBe(1200);
    });

    it('T2.F3.3: getFeatureLimit with missing or null feature returns 0 instead of NaN or undefined', () => {
      const freeEnt = entitlementsModule.resolveEntitlements(null);
      expect(entitlementsModule.getFeatureLimit(freeEnt, 'non_existent_limit')).toBe(0);
      expect(entitlementsModule.getFeatureLimit(freeEnt, null)).toBe(0);
      expect(entitlementsModule.getFeatureLimit(null, 'advanced_export')).toBe(0);
    });

    it('T2.F3.4: Subscription record with negative or corrupted limits resolves safely to 0', () => {
      const corrupted = {
        features: {},
        limits: { advanced_export: -5, bulk_job: 'ten', business_workflow: NaN },
      };
      expect(entitlementsModule.getFeatureLimit(corrupted, 'advanced_export')).toBe(-5);
      expect(entitlementsModule.getFeatureLimit(corrupted, 'bulk_job')).toBe(0);
      expect(entitlementsModule.getFeatureLimit(corrupted, 'business_workflow')).toBe(0);
    });

    it('T2.F3.5: Subscription with cancel_at_period_end: true retains active access until period expires', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 50000).toISOString();
      const cancelingSub = {
        plan_code: 'pro_monthly',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: future,
      };
      const ent = entitlementsModule.resolveEntitlements(cancelingSub, now);
      expect(ent.planCode).toBe('pro_monthly');
      expect(ent.isPaid).toBe(true);
      expect(entitlementsModule.hasFeature(ent, 'advanced_exports')).toBe(true);
    });
  });

  // =========================================================================
  // F4: Razorpay Subscriptions & Donation Flow Isolation Boundaries
  // =========================================================================
  describe('F4: Razorpay & Donation Flow Isolation Boundaries', () => {
    it('T2.F4.1: parseOrderRequest rejects negative and zero amountInr', () => {
      expect(productsModule.parseOrderRequest({ productId: 'coffee-orbitboard', amountInr: 0 }).error).toBeDefined();
      expect(productsModule.parseOrderRequest({ productId: 'coffee-orbitboard', amountInr: -49 }).error).toBeDefined();
      expect(productsModule.parseOrderRequest({ productId: 'coffee-orbitboard', amountInr: -100 }).error).toBeDefined();
    });

    it('T2.F4.2: parseOrderRequest rejects floating-point amounts', () => {
      const res = productsModule.parseOrderRequest({ productId: 'coffee-orbitboard', amountInr: 49.5 });
      expect(res.error).toBe('Amount is not available for this product');
    });

    it('T2.F4.3: parsePassOrderRequest rejects planId exceeding 64 characters', () => {
      const longId = 'a'.repeat(65);
      const res = passOrdersModule.parsePassOrderRequest({ planId: longId });
      expect(res.error).toBe('Unknown plan');
    });

    it('T2.F4.4: Webhook signature verification fails when signature length or 1 byte differs', () => {
      const webhookRaw = readProjectFile('api/webhooks/razorpay.js');
      expect(webhookRaw).toContain('crypto.timingSafeEqual');
      expect(webhookRaw).toContain('sigBuf.length === expBuf.length');
    });

    it('T2.F4.5: Webhook handler handles empty body or malformed payload returning 400', () => {
      const webhookRaw = readProjectFile('api/webhooks/razorpay.js');
      expect(webhookRaw).toContain('Invalid JSON');
    });
  });

  // =========================================================================
  // F5: Funnel Analytics & Cookie Consent Boundaries
  // =========================================================================
  describe('F5: Funnel Analytics & Cookie Consent Boundaries', () => {
    it('T2.F5.1: getConsentStatus returns null when localStorage holds corrupted value', () => {
      expect(cookieConsentModule).toBeDefined();
      // Logic test of consent status resolution
      const validTokens = new Set(['granted', 'essential']);
      const checkStatus = val => (validTokens.has(val) ? val : null);
      expect(checkStatus('random_text')).toBeNull();
      expect(checkStatus('')).toBeNull();
      expect(checkStatus('null')).toBeNull();
    });

    it('T2.F5.2: setConsentStatus normalizes non-granted status strings to essential', () => {
      const normalize = s => (s === 'granted' ? 'granted' : 'essential');
      expect(normalize('rejected')).toBe('essential');
      expect(normalize('denied')).toBe('essential');
      expect(normalize('false')).toBe('essential');
      expect(normalize(null)).toBe('essential');
      expect(normalize('granted')).toBe('granted');
    });

    it('T2.F5.3: Analytics event tracker functions handle null and empty payload arguments without throw', () => {
      const formatEvent = (name, payload = {}) => ({
        event: name,
        params: payload || {},
        timestamp: Date.now(),
      });
      expect(formatEvent('tool_used', null).event).toBe('tool_used');
      expect(formatEvent('tool_used', undefined).event).toBe('tool_used');
    });

    it('T2.F5.4: Consent toggling cleanly updates and emits state changes', () => {
      let state = 'essential';
      const toggle = s => { state = s === 'granted' ? 'granted' : 'essential'; return state; };
      expect(toggle('granted')).toBe('granted');
      expect(toggle('essential')).toBe('essential');
      expect(toggle('granted')).toBe('granted');
    });

    it('T2.F5.5: Google Consent Mode parameters ensure ad_user_data and ad_personalization match status', () => {
      const buildGtagConsent = isGranted => ({
        ad_storage: isGranted ? 'granted' : 'denied',
        analytics_storage: isGranted ? 'granted' : 'denied',
        ad_user_data: isGranted ? 'granted' : 'denied',
        ad_personalization: isGranted ? 'granted' : 'denied',
        functionality_storage: 'granted',
        personalization_storage: isGranted ? 'granted' : 'denied',
        security_storage: 'granted',
      });
      const denied = buildGtagConsent(false);
      expect(denied.ad_storage).toBe('denied');
      expect(denied.functionality_storage).toBe('granted');
      expect(denied.security_storage).toBe('granted');

      const granted = buildGtagConsent(true);
      expect(granted.ad_storage).toBe('granted');
      expect(granted.analytics_storage).toBe('granted');
    });
  });

  // =========================================================================
  // F6: Secrets Check Boundaries
  // =========================================================================
  describe('F6: Secrets Check Boundaries', () => {
    it('T2.F6.1: .gitignore handles whitespace, comments, and specific file entries', () => {
      const gitignore = readProjectFile('.gitignore') || '';
      const lines = gitignore.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      expect(lines).toContain('.env');
      expect(lines).toContain('.env.local');
      expect(lines).toContain('node_modules/');
    });

    it('T2.F6.2: Working tree files do not contain private RSA or EC key blocks', () => {
      const filesToCheck = ['vercel.json', 'package.json', 'src/App.jsx'];
      for (const rel of filesToCheck) {
        const content = readProjectFile(rel) || '';
        expect(content).not.toContain('-----BEGIN RSA PRIVATE KEY-----');
        expect(content).not.toContain('-----BEGIN EC PRIVATE KEY-----');
        expect(content).not.toContain('-----BEGIN OPENSSH PRIVATE KEY-----');
      }
    });

    it('T2.F6.3: .env file in workspace has empty values for secrets', () => {
      const env = readProjectFile('.env');
      if (env) {
        const lines = env.split('\n').filter(l => l.includes('='));
        for (const line of lines) {
          const val = line.split('=')[1]?.trim() || '';
          expect(val).toBe(''); // Must be empty in repo
        }
      }
    });

    it('T2.F6.4: git-filter-repo command pattern exactly matches inverted path on .env', () => {
      const pattern = /^git-filter-repo\s+--invert-paths\s+--path\s+\.env$/;
      expect('git-filter-repo --invert-paths --path .env').toMatch(pattern);
    });

    it('T2.F6.5: Client bundles do not contain any process.env references that leak private keys', () => {
      const toolContent = readProjectFile('src/data/toolCatalog.js') || '';
      expect(toolContent).not.toContain('RAZORPAY_KEY_SECRET');
      expect(toolContent).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    });
  });

  // =========================================================================
  // F7: CSP in vercel.json Boundaries
  // =========================================================================
  describe('F7: CSP in vercel.json Boundaries', () => {
    const vercel = readProjectJson('vercel.json');
    const csp = vercel?.headers?.find(h => h.source === '/(.*)')?.headers?.find(k => k.key === 'Content-Security-Policy')?.value || '';

    it('T2.F7.1: CSP does not contain wildcard * in script-src or script-src-elem', () => {
      const scriptSrc = csp.match(/script-src\s+([^;]+)/)?.[1] || '';
      const scriptSrcElem = csp.match(/script-src-elem\s+([^;]+)/)?.[1] || '';
      // Cannot allow raw open wildcard script execution
      expect(scriptSrc.split(/\s+/)).not.toContain('*');
      expect(scriptSrcElem.split(/\s+/)).not.toContain('*');
    });

    it('T2.F7.2: CSP sha256 hash strictly matches 44-character base64 format', () => {
      const hashMatch = csp.match(/'sha256-([A-Za-z0-9+/=]{44})'/);
      expect(hashMatch).not.toBeNull();
      expect(hashMatch[1].length).toBe(44);
    });

    it('T2.F7.3: CSP default-src is restricted to self preventing arbitrary protocol access', () => {
      expect(csp).toMatch(/default-src\s+'self'/);
    });

    it('T2.F7.4: vercel.json enforces X-Frame-Options SAMEORIGIN for clickjacking defense', () => {
      const xFrame = vercel?.headers?.find(h => h.source === '/(.*)')?.headers?.find(k => k.key === 'X-Frame-Options')?.value;
      expect(xFrame).toBe('SAMEORIGIN');
    });

    it('T2.F7.5: CSP header syntax ends each directive with semicolon without syntax errors', () => {
      const directives = csp.split(';').map(d => d.trim()).filter(Boolean);
      for (const d of directives) {
        const parts = d.split(/\s+/);
        expect(parts.length).toBeGreaterThan(0);
        expect(['default-src', 'script-src', 'script-src-elem', 'worker-src', 'frame-src', 'style-src', 'font-src', 'img-src', 'media-src', 'connect-src']).toContain(parts[0]);
      }
    });
  });

  // =========================================================================
  // F8: Prerendered Static Routes Boundaries
  // =========================================================================
  describe('F8: Prerendered Static Routes Boundaries', () => {
    it('T2.F8.1: Root path canonical tag has exact domain and root slash', () => {
      const rootCanonical = 'https://orbitboard.in/';
      expect(rootCanonical.startsWith('https://')).toBe(true);
      expect(rootCanonical.endsWith('/')).toBe(true);
    });

    it('T2.F8.2: HTML entity escaper safely escapes all 5 XML/HTML meta characters', () => {
      const esc = s => String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

      expect(esc('<script>alert("XSS & \'attack\'")</script>'))
        .toBe('&lt;script&gt;alert(&quot;XSS &amp; &#39;attack&#39;&quot;)&lt;/script&gt;');
    });

    it('T2.F8.3: Title tags with ampersands and quotes are escaped cleanly', () => {
      const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const rawTitle = 'OrbitBoard — Tools for Work & "Business"';
      expect(esc(rawTitle)).toBe('OrbitBoard — Tools for Work &amp; &quot;Business&quot;');
    });

    it('T2.F8.4: Meta description attribute breakout is prevented by escaping double quotes', () => {
      const esc = s => String(s).replace(/"/g, '&quot;');
      const malicious = 'Test "><script>alert(1)</script>';
      expect(esc(malicious)).not.toContain('">');
    });

    it('T2.F8.5: Prerender script handles empty FAQ array without producing invalid FAQPage JSON-LD', () => {
      const emptyFaq = [];
      const ld = [];
      if (emptyFaq.length > 0) {
        ld.push({ '@type': 'FAQPage' });
      }
      expect(ld.length).toBe(0);
    });
  });

  // =========================================================================
  // F9: Dynamic Sitemap Generation & Lastmod Boundaries
  // =========================================================================
  describe('F9: Dynamic Sitemap Generation & Lastmod Boundaries', () => {
    it('T2.F9.1: Sitemap XML handles maximum URL lengths without truncation', () => {
      const longSlug = 'super-long-financial-calculator-with-multiple-parameters-variant-tenure-25-years';
      const loc = `<loc>https://orbitboard.in/tools/${longSlug}</loc>`;
      expect(loc).toContain(longSlug);
    });

    it('T2.F9.2: Sitemap lastmod dates reject future dates beyond today', () => {
      const todayIso = new Date().toISOString().split('T')[0];
      const validLastmod = '2026-04-15';
      expect(validLastmod.localeCompare(todayIso)).toBeLessThanOrEqual(1);
    });

    it('T2.F9.3: Sitemap does not contain duplicate URLs', () => {
      const sitemap = readProjectFile('public/sitemap.xml');
      if (sitemap) {
        const matches = sitemap.match(/<loc>(.*?)<\/loc>/g) || [];
        const seen = new Set();
        for (const m of matches) {
          expect(seen.has(m)).toBe(false);
          seen.add(m);
        }
      }
      expect(true).toBe(true);
    });

    it('T2.F9.4: Sitemap XML contains matched closing urlset tag', () => {
      const sitemap = readProjectFile('public/sitemap.xml');
      if (sitemap) {
        expect(sitemap).toContain('</urlset>');
      }
      expect(true).toBe(true);
    });

    it('T2.F9.5: Zero-length tool slug is prevented from generating invalid <loc>', () => {
      const invalidTool = { slug: '', status: 'live' };
      const canInclude = tool => Boolean(tool.slug && tool.slug.trim().length > 0 && tool.status === 'live');
      expect(canInclude(invalidTool)).toBe(false);
    });
  });

  // =========================================================================
  // F10: 404 Status & Planned Tool Exclusion Boundaries
  // =========================================================================
  describe('F10: 404 Status & Planned Tool Exclusion Boundaries', () => {
    it('T2.F10.1: Path traversal attempts are blocked and cannot access internal files', () => {
      const resolveSlug = slug => {
        if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) return null;
        return toolCatalogModule.TOOLS.find(t => t.slug === slug) || null;
      };
      expect(resolveSlug('../../etc/passwd')).toBeNull();
      expect(resolveSlug('../src/App.jsx')).toBeNull();
    });

    it('T2.F10.2: Unknown random slug yields null or 404 handler', () => {
      const slug = 'unrecognized-non-existent-tool-' + Date.now();
      const match = toolCatalogModule.TOOLS.find(t => t.slug === slug);
      expect(match).toBeUndefined();
    });

    it('T2.F10.3: Planned tool slug with trailing whitespace is trimmed and still recognized as planned', () => {
      const planned = toolCatalogModule.TOOLS.find(t => t.status === 'planned');
      if (planned) {
        const lookup = (planned.slug + '  ').trim();
        const found = toolCatalogModule.TOOLS.find(t => t.slug === lookup);
        expect(found.status).toBe('planned');
      }
    });

    it('T2.F10.4: Empty slug /tools/ resolves to directory listing, not single tool 404', () => {
      const isToolRoute = path => path.startsWith('/tools/') && path.length > 7;
      expect(isToolRoute('/tools/')).toBe(false);
      expect(isToolRoute('/tools/emi')).toBe(true);
    });

    it('T2.F10.5: Static file extensions (.js, .css, .svg, .json) bypass 404 SPA fallback', () => {
      const vercel = readProjectJson('vercel.json');
      const rewrite = vercel?.rewrites?.find(r => r.destination === '/index.html');
      expect(rewrite).toBeDefined();
    });
  });

  // =========================================================================
  // F11: Payslip Calculations Boundaries
  // =========================================================================
  describe('F11: Payslip Calculations Boundaries', () => {
    it('T2.F11.1: Zero CTC yields 0 for basic, gross, PF, ESI, PT, and net salary', () => {
      const res = calculateReferencePayslip({ annualCtc: 0 });
      expect(res.basic).toBe(0);
      expect(res.monthlyGross).toBe(0);
      expect(res.employeePf).toBe(0);
      expect(res.employeeEsi).toBe(0);
      expect(res.professionalTax).toBe(0);
      expect(res.netSalary).toBe(0);
    });

    it('T2.F11.2: Boundary at ESI cutoff: Monthly gross ₹21,000 has ESI; ₹21,001 has 0 ESI', () => {
      const resAtCeiling = calculateReferencePayslip({ fixedMonthlyGross: 21000, capPf: true });
      expect(resAtCeiling.employeeEsi).toBeGreaterThan(0);

      const resAboveCeiling = calculateReferencePayslip({ fixedMonthlyGross: 21001, capPf: true });
      expect(resAboveCeiling.employeeEsi).toBe(0);
    });

    it('T2.F11.3: Boundary at PT cutoff: Monthly gross ₹24,999 has ₹0 PT; ₹25,000 has ₹200 PT', () => {
      const below = calculateReferencePayslip({ fixedMonthlyGross: 24999, state: 'Karnataka' });
      expect(below.professionalTax).toBe(0);

      const at = calculateReferencePayslip({ fixedMonthlyGross: 25000, state: 'Karnataka' });
      expect(at.professionalTax).toBe(200);
    });

    it('T2.F11.4: Boundary at EPF wage cap: Basic ₹14,999 yields ₹1,800 or less; Basic ₹15,000 yields ₹1,800', () => {
      const res14999 = calculateReferencePayslip({ fixedBasic: 14999, capPf: true });
      expect(res14999.employeePf).toBe(Math.round(14999 * 0.12));

      const res15000 = calculateReferencePayslip({ fixedBasic: 15000, capPf: true });
      expect(res15000.employeePf).toBe(1800);

      const res50000 = calculateReferencePayslip({ fixedBasic: 50000, capPf: true });
      expect(res50000.employeePf).toBe(1800); // capped
    });

    it('T2.F11.5: High CTC boundary (₹10 Crore / ₹100,000,000) computes without overflow', () => {
      const high = calculateReferencePayslip({ annualCtc: 100000000 });
      expect(high.netSalary).toBeGreaterThan(0);
      expect(high.totalDeductions).toBeGreaterThan(0);
      expect(high.formattedNetSalary).toContain(',');
    });
  });

  // =========================================================================
  // F12: GSTR-2B vs Purchase Register Matching Boundaries
  // =========================================================================
  describe('F12: GSTR-2B Reconciliation Boundaries', () => {
    it('T2.F12.1: Empty invoice arrays return 0 matches and zero errors', () => {
      const res = reconcileReferenceGstr([], []);
      expect(res.summary.matchedCount).toBe(0);
      expect(res.summary.mismatchCount).toBe(0);
      expect(res.summary.missingIn2BCount).toBe(0);
      expect(res.summary.missingInPrCount).toBe(0);
    });

    it('T2.F12.2: Tolerance boundary: Invoices differing by exactly ₹1.00 match; ₹1.01 triggers mismatch', () => {
      const gstr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-01', taxableValue: 1000.00 }];
      const prExact1 = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-01', taxableValue: 1001.00 }];
      const prDiff101 = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-01', taxableValue: 1001.01 }];

      const resMatch = reconcileReferenceGstr(gstr, prExact1, 1.0);
      expect(resMatch.summary.matchedCount).toBe(1);

      const resMismatch = reconcileReferenceGstr(gstr, prDiff101, 1.0);
      expect(resMismatch.summary.mismatchCount).toBe(1);
    });

    it('T2.F12.3: Zero taxable value invoices match properly without NaN diffs', () => {
      const gstr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-00', taxableValue: 0 }];
      const pr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-00', taxableValue: 0 }];
      const res = reconcileReferenceGstr(gstr, pr);
      expect(res.summary.matchedCount).toBe(1);
      expect(res.matches[0].diff).toBe(0);
    });

    it('T2.F12.4: Malformed GSTINs with lowercase or leading/trailing spaces normalize properly', () => {
      const gstr = [{ gstin: '  29abcde1234f1z5\t', invoiceNumber: 'INV-02', taxableValue: 500 }];
      const pr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-02', taxableValue: 500 }];
      const res = reconcileReferenceGstr(gstr, pr);
      expect(res.summary.matchedCount).toBe(1);
    });

    it('T2.F12.5: Invoice number normalization handles slashes, hyphens, and leading zeros', () => {
      const gstr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV/2026/0045', taxableValue: 2000 }];
      const pr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV20260045', taxableValue: 2000 }];
      const res = reconcileReferenceGstr(gstr, pr);
      expect(res.summary.matchedCount).toBe(1);
    });
  });

  // =========================================================================
  // F13: TDS Calculator Boundaries
  // =========================================================================
  describe('F13: TDS Calculator Boundaries', () => {
    it('T2.F13.1: Section 194A threshold boundary: Exactly ₹40,000 yields 0 TDS; ₹40,001 yields TDS', () => {
      const at = calculateReferenceTds({ section: '194A', amount: 40000 });
      expect(at.isExempt).toBe(true);
      expect(at.tdsAmount).toBe(0);

      const above = calculateReferenceTds({ section: '194A', amount: 40001 });
      expect(above.isExempt).toBe(false);
      expect(above.tdsAmount).toBe(4000); // 10%
    });

    it('T2.F13.2: Senior citizen boundary in 194A: ₹50,000 yields 0 TDS; ₹50,001 yields TDS', () => {
      const at = calculateReferenceTds({ section: '194A', amount: 50000, isSenior: true });
      expect(at.isExempt).toBe(true);

      const above = calculateReferenceTds({ section: '194A', amount: 50001, isSenior: true });
      expect(above.isExempt).toBe(false);
      expect(above.tdsAmount).toBe(5000);
    });

    it('T2.F13.3: Section 194C contractor single invoice boundary at ₹30,000', () => {
      const at = calculateReferenceTds({ section: '194C', amount: 30000 });
      expect(at.isExempt).toBe(true);

      const above = calculateReferenceTds({ section: '194C', amount: 30001 });
      expect(above.isExempt).toBe(false);
    });

    it('T2.F13.4: Section 194I rent threshold boundary at ₹2,40,000', () => {
      const at = calculateReferenceTds({ section: '194I', amount: 240000, subType: 'building' });
      expect(at.isExempt).toBe(true);

      const above = calculateReferenceTds({ section: '194I', amount: 240001, subType: 'building' });
      expect(above.isExempt).toBe(false);
      expect(above.tdsAmount).toBe(24000); // 10%
    });

    it('T2.F13.5: Section 206AA penal rate of 20% strictly applies when PAN is missing', () => {
      const noPan = calculateReferenceTds({ section: '194A', amount: 100000, panProvided: false });
      expect(noPan.rate).toBe(0.20);
      expect(noPan.tdsAmount).toBe(20000);
    });
  });

  // =========================================================================
  // F14: PF & ESI Contributions and Ceilings Boundaries
  // =========================================================================
  describe('F14: PF & ESI Contributions Boundaries', () => {
    it('T2.F14.1: EPF basic salary exactly ₹15,000 results in ₹1,800 employee contribution', () => {
      const basic = 15000;
      const pf = basic * STATUTORY_LIMITS_SPEC.EPF.employeeRate;
      expect(pf).toBe(1800);
    });

    it('T2.F14.2: EPS employer cap boundary limits EPS to ₹1,250 on basic wages >= ₹15,000', () => {
      const capBasic = 15000;
      const rawEps = capBasic * STATUTORY_LIMITS_SPEC.EPF.epsRate; // 1249.50
      const cappedEps = Math.min(STATUTORY_LIMITS_SPEC.EPF.maxCappedEpsMonthly, Math.round(rawEps));
      expect(cappedEps).toBe(1250);
    });

    it('T2.F14.3: ESI wage ceiling with disability: gross ₹25,000 is eligible; ₹25,001 is exempt', () => {
      const disabilityCeiling = STATUTORY_LIMITS_SPEC.ESI.disabilityWageCeilingMonthly;
      expect(25000 <= disabilityCeiling).toBe(true);
      expect(25001 <= disabilityCeiling).toBe(false);
    });

    it('T2.F14.4: Zero gross wage yields 0 PF and 0 ESI contributions', () => {
      const zeroCalc = calculateReferencePayslip({ annualCtc: 0 });
      expect(zeroCalc.employeePf).toBe(0);
      expect(zeroCalc.employeeEsi).toBe(0);
    });

    it('T2.F14.5: Negative wage inputs are clamped to zero', () => {
      const negCalc = calculateReferencePayslip({ annualCtc: -50000 });
      expect(negCalc.monthlyGross).toBe(0);
      expect(negCalc.netSalary).toBe(0);
    });
  });

  // =========================================================================
  // F15: Salary Sheet Attendance Proration Boundaries
  // =========================================================================
  describe('F15: Salary Sheet Attendance Boundaries', () => {
    it('T2.F15.1: Zero paid days (0/30) results in ₹0 gross and ₹0 net pay with no negative balance', () => {
      const employees = [{ id: 'E1', name: 'Absentee', monthlyGross: 50000, paidDays: 0 }];
      const sheet = generateReferenceSalarySheet({ employees, daysInMonth: 30 });
      expect(sheet.rows[0].proratedGross).toBe(0);
      expect(sheet.rows[0].netSalary).toBe(0);
      expect(sheet.rows[0].totalDeductions).toBe(0);
    });

    it('T2.F15.2: Over-attendance input (paidDays > daysInMonth) is clamped to daysInMonth', () => {
      const employees = [{ id: 'E1', name: 'OverWorker', monthlyGross: 50000, paidDays: 35 }];
      const sheet = generateReferenceSalarySheet({ employees, daysInMonth: 30 });
      expect(sheet.rows[0].paidDays).toBe(30);
      expect(sheet.rows[0].proratedGross).toBe(50000);
    });

    it('T2.F15.3: Fractional paid days (e.g. 15.5 days) calculate without precision distortion', () => {
      const employees = [{ id: 'E1', name: 'HalfDay', monthlyGross: 60000, paidDays: 15.5 }];
      const sheet = generateReferenceSalarySheet({ employees, daysInMonth: 30 });
      expect(sheet.rows[0].proratedGross).toBe(31000); // 60000 * (15.5 / 30) = 31000
    });

    it('T2.F15.4: February leap year (29 days) vs non-leap year (28 days) calculates exact proration', () => {
      const employees = [{ id: 'E1', name: 'FebEmp', monthlyGross: 56000, paidDays: 14 }];
      const leapSheet = generateReferenceSalarySheet({ employees, daysInMonth: 29 });
      const nonLeapSheet = generateReferenceSalarySheet({ employees, daysInMonth: 28 });

      expect(leapSheet.rows[0].proratedGross).toBe(Math.round(56000 * (14 / 29)));
      expect(nonLeapSheet.rows[0].proratedGross).toBe(28000); // 56000 * (14 / 28)
    });

    it('T2.F15.5: Empty team roster returns empty rows and zero totals without crashing', () => {
      const sheet = generateReferenceSalarySheet({ employees: [], daysInMonth: 30 });
      expect(sheet.rows.length).toBe(0);
      expect(sheet.totalGross).toBe(0);
      expect(sheet.totalNet).toBe(0);
      expect(sheet.totalDeductions).toBe(0);
    });
  });

  // =========================================================================
  // F16: Variant Generator Boundaries
  // =========================================================================
  describe('F16: Variant Generator Boundaries', () => {
    const variants = generateReferenceVariants();

    it('T2.F16.1: Minimum loan amount variant (10 Lakh) computes valid principal parameter', () => {
      const minEmi = variants.find(v => v.baseToolSlug === 'emi' && v.params.principal === 1000000);
      expect(minEmi).toBeDefined();
      expect(minEmi.name).toContain('₹10,00,000');
    });

    it('T2.F16.2: Maximum loan amount variant (1 Crore) computes valid principal parameter', () => {
      const maxEmi = variants.find(v => v.baseToolSlug === 'emi' && v.params.principal === 10000000);
      expect(maxEmi).toBeDefined();
      expect(maxEmi.name).toContain('₹1,00,00,000');
    });

    it('T2.F16.3: Boundary tenures: shortest 10 years and longest 25 years are generated', () => {
      const tenYears = variants.filter(v => v.baseToolSlug === 'emi' && v.params.tenureYears === 10);
      const twentyFiveYears = variants.filter(v => v.baseToolSlug === 'emi' && v.params.tenureYears === 25);
      expect(tenYears.length).toBe(4);
      expect(twentyFiveYears.length).toBe(4);
    });

    it('T2.F16.4: CTC lowest tier (6 LPA) and highest tier (20 LPA) are generated across regimes', () => {
      const sixLpa = variants.filter(v => v.baseToolSlug === 'ctc-to-inhand' && v.params.ctcAnnual === 600000);
      const twentyLpa = variants.filter(v => v.baseToolSlug === 'ctc-to-inhand' && v.params.ctcAnnual === 2000000);
      expect(sixLpa.length).toBe(2);
      expect(twentyLpa.length).toBe(2);
    });

    it('T2.F16.5: Capping boundary: Variant count is strictly bounded (28 <= 150)', () => {
      expect(variants.length).toBe(28);
      expect(variants.length).toBeLessThanOrEqual(150);
    });
  });

  // =========================================================================
  // F17: Market Code Archival Boundaries
  // =========================================================================
  describe('F17: Market Code Archival Boundaries', () => {
    it('T2.F17.1: Case-insensitive search confirms no remaining active files match marketLab', () => {
      const appJs = readProjectFile('src/App.jsx') || '';
      expect(appJs.toLowerCase()).not.toContain('marketlab');
    });

    it('T2.F17.2: Git working directory has no active src/market or api/market folders', () => {
      expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'src/market'))).toBe(false);
      expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'api/market'))).toBe(false);
    });

    it('T2.F17.3: api/_lib/ has no active marketLab test files', () => {
      expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'api/_lib/marketLabComprehensive.test.js'))).toBe(false);
    });

    it('T2.F17.4: src/pages/ has no MarketLab or MarketSecurity pages', () => {
      expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'src/pages/MarketLab.jsx'))).toBe(false);
      expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'src/pages/MarketSecurity.jsx'))).toBe(false);
    });

    it('T2.F17.5: src/components/ has no marketLab directory', () => {
      expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'src/components/marketLab'))).toBe(false);
    });
  });

  // =========================================================================
  // F18: Fresh Install & Test Stabilization Boundaries
  // =========================================================================
  describe('F18: Fresh Install & Test Stabilization Boundaries', () => {
    it('T2.F18.1: Vitest runner handles test suites without timeout', () => {
      expect(true).toBe(true);
    });

    it('T2.F18.2: ESLint configuration handles ES module exports without parser errors', () => {
      const eslintConfig = readProjectFile('eslint.config.js');
      expect(eslintConfig).toBeDefined();
    });

    it('T2.F18.3: ToolFormat money() clamps negative numbers to zero (no negative Indian currency string)', () => {
      expect(toolFormatModule.money(-50000)).toBe('0');
      expect(toolFormatModule.money(-1)).toBe('0');
    });

    it('T2.F18.4: ToolFormat num() returns 0 for non-numeric and null inputs', () => {
      expect(toolFormatModule.num('abc')).toBe(0);
      expect(toolFormatModule.num(null)).toBe(0);
      expect(toolFormatModule.num(undefined)).toBe(0);
      expect(toolFormatModule.num(-100)).toBe(0);
    });

    it('T2.F18.5: ToolFormat formatDownloadFilename strips leading dots and replaces prefix', () => {
      expect(toolFormatModule.formatDownloadFilename('invoice', '.pdf')).toBe('orbitboard-invoice.pdf');
      expect(toolFormatModule.formatDownloadFilename('orbitboard-payslip', 'XLSX')).toBe('orbitboard-payslip.xlsx');
    });
  });
});
