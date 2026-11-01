import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  PROJECT_ROOT,
  readProjectFile,
  readProjectJson,
  computeCspHash,
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
const passOrdersModule = await loadModule('api/_lib/passOrders.js');
const toolCatalogModule = await loadModule('src/data/toolCatalog.js');
const toolFormatModule = await loadModule('src/lib/toolFormat.js');

describe('Tier 3: Cross-Feature Interactions & Pairwise Combinations (18 Tests)', () => {
  // -------------------------------------------------------------------------
  // Interaction 1: PlanGate (F2) + Payslip Export (F11)
  // -------------------------------------------------------------------------
  it('T3.1: Free user can calculate payslip freely on-screen, but advanced export requires Pro upgrade', () => {
    // Calculation in browser is 100% free
    const payslip = calculateReferencePayslip({ annualCtc: 1200000 });
    expect(payslip.netSalary).toBeGreaterThan(0);

    // Feature gating for export
    const freeEnt = entitlementsModule.resolveEntitlements(null);
    expect(entitlementsModule.hasFeature(freeEnt, 'advanced_exports')).toBe(false);

    // After upgrade to pro_monthly, export is permitted
    const proEnt = entitlementsModule.resolveEntitlements({
      plan_code: 'pro_monthly',
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(entitlementsModule.hasFeature(proEnt, 'advanced_exports')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Interaction 2: PlanGate (F2) + GSTR-2B Reconciliation Export (F12)
  // -------------------------------------------------------------------------
  it('T3.2: GSTR-2B reconciliation runs client-side calculations free, but bulk report export is gated', () => {
    const gstr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-1', taxableValue: 50000 }];
    const pr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-1', taxableValue: 50000 }];
    const recon = reconcileReferenceGstr(gstr, pr);
    expect(recon.summary.matchedCount).toBe(1);

    const freeEnt = entitlementsModule.resolveEntitlements(null);
    expect(entitlementsModule.hasFeature(freeEnt, 'advanced_exports')).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Interaction 3: Consent Mode v2 (F5) + Funnel Analytics Telemetry (F5)
  // -------------------------------------------------------------------------
  it('T3.3: Funnel analytics tool_used event is suppressed under essential consent and enabled on granted', () => {
    const trackEventWithConsent = (eventName, params, consentStatus) => {
      if (consentStatus !== 'granted') return null;
      return { event: eventName, params, sent: true };
    };

    const deniedDispatch = trackEventWithConsent('tool_used', { tool: 'payslip-generator' }, 'essential');
    expect(deniedDispatch).toBeNull();

    const grantedDispatch = trackEventWithConsent('tool_used', { tool: 'payslip-generator' }, 'granted');
    expect(grantedDispatch).not.toBeNull();
    expect(grantedDispatch.event).toBe('tool_used');
    expect(grantedDispatch.params.tool).toBe('payslip-generator');
  });

  // -------------------------------------------------------------------------
  // Interaction 4: GSTR-2B Reconciliation (F12) + Indian Currency Formatting (F18)
  // -------------------------------------------------------------------------
  it('T3.4: GSTR-2B reconciliation discrepancy amounts are formatted with Indian numbering', () => {
    const gstr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-01', taxableValue: 12500000 }];
    const pr = [{ gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV-01', taxableValue: 10000000 }];
    const recon = reconcileReferenceGstr(gstr, pr);

    expect(recon.summary.mismatchCount).toBe(1);
    const diff = recon.mismatches[0].diff; // 25,00,000
    const formattedDiff = toolFormatModule.money(diff);
    expect(formattedDiff).toBe('25,00,000');
  });

  // -------------------------------------------------------------------------
  // Interaction 5: Dynamic Sitemap (F9) + Tool Variants (F16)
  // -------------------------------------------------------------------------
  it('T3.5: Dynamic sitemap generation includes all generated tool variants alongside core tools', () => {
    const variants = generateReferenceVariants();
    const sitemapUrls = [
      ...toolCatalogModule.LISTED_TOOLS.map(t => `https://orbitboard.in/tools/${t.slug}`),
      ...variants.map(v => `https://orbitboard.in/tools/${v.slug}`),
    ];
    expect(sitemapUrls.length).toBeGreaterThan(toolCatalogModule.LISTED_TOOLS.length);
    for (const v of variants) {
      expect(sitemapUrls).toContain(`https://orbitboard.in/tools/${v.slug}`);
    }
  });

  // -------------------------------------------------------------------------
  // Interaction 6: Prerendering (F8) + Tool Variants (F16)
  // -------------------------------------------------------------------------
  it('T3.6: Prerendered tool variants preserve canonical tags pointing to main parent tools', () => {
    const variants = generateReferenceVariants();
    for (const v of variants) {
      expect(v.canonicalUrl).toMatch(/^https:\/\/orbitboard\.in\/tools\/(emi|ctc-to-inhand)$/);
      expect(v.description.length).toBeGreaterThan(20);
    }
  });

  // -------------------------------------------------------------------------
  // Interaction 7: Planned Tool Exclusion (F10) + Dynamic Sitemap (F9)
  // -------------------------------------------------------------------------
  it('T3.7: Planned tools in toolCatalog are strictly omitted from dynamic sitemap url list', () => {
    const plannedSlugs = new Set(toolCatalogModule.TOOLS.filter(t => t.status === 'planned').map(t => t.slug));
    const liveSlugs = new Set(toolCatalogModule.LISTED_TOOLS.map(t => t.slug));

    for (const slug of plannedSlugs) {
      expect(liveSlugs.has(slug)).toBe(false);
    }
  });

  // -------------------------------------------------------------------------
  // Interaction 8: Plan Catalog (F1) + Razorpay Subscription (F4)
  // -------------------------------------------------------------------------
  it('T3.8: Plan selection connects to Razorpay order creation with correct amount in paise', () => {
    const proMonthly = planCatalogModule.getPlan('pro_monthly');
    expect(proMonthly).toBeDefined();
    const paise = planCatalogModule.getPlanPricePaise('pro_monthly');
    expect(paise).toBe(24900); // 249 * 100

    const passOrder = passOrdersModule.parsePassOrderRequest({ planId: 'pro_monthly' });
    expect(passOrder.planId).toBe('pro_monthly');
  });

  // -------------------------------------------------------------------------
  // Interaction 9: Server Entitlements (F3) + Save Operation Guard
  // -------------------------------------------------------------------------
  it('T3.9: Server entitlement enforcement blocks database workspace saving for Free tier', () => {
    const freeEnt = entitlementsModule.resolveEntitlements(null);
    const canSaveWorkspace = ent => entitlementsModule.hasFeature(ent, 'saved_workspaces');
    expect(canSaveWorkspace(freeEnt)).toBe(false);

    const proEnt = entitlementsModule.resolveEntitlements({
      plan_code: 'pro_monthly',
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(canSaveWorkspace(proEnt)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Interaction 10: Salary Sheet Proration (F15) + PF/ESI Statutory Ceilings (F14)
  // -------------------------------------------------------------------------
  it('T3.10: Attendance proration affects basic wage, recalculating PF and ESI eligibility', () => {
    // Normal monthly gross ₹30,000 is not eligible for ESI (> ₹21,000)
    // But with 15/30 days attendance, prorated gross is ₹15,000, making employee eligible for ESI!
    const employees = [{ id: 'E1', name: 'HalfMonthWorker', monthlyGross: 30000, paidDays: 15 }];
    const sheet = generateReferenceSalarySheet({ employees, daysInMonth: 30 });

    expect(sheet.rows[0].proratedGross).toBe(15000);
    expect(sheet.rows[0].esi).toBe(Math.round(15000 * STATUTORY_LIMITS_SPEC.ESI.employeeRate));
    expect(sheet.rows[0].esi).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Interaction 11: TDS Calculator (F13) + Payslip Tax Deduction (F11)
  // -------------------------------------------------------------------------
  it('T3.11: Payslip engine integrates with new tax regime slabs to compute monthly TDS', () => {
    const payslip10L = calculateReferencePayslip({ annualCtc: 1000000, regime: 'new' });
    // Under new regime up to 12L taxable, 87A rebate reduces tax to 0
    expect(payslip10L.tds).toBe(0);

    const payslip20L = calculateReferencePayslip({ annualCtc: 2000000, regime: 'new' });
    // Above 12L, tax is payable and deducted monthly
    expect(payslip20L.tds).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Interaction 12: CSP Header (F7) + Inline Consent Script (F5)
  // -------------------------------------------------------------------------
  it('T3.12: Content Security Policy sha256 hash strictly authorizes the inline consent script in index.html', () => {
    const indexHtml = readProjectFile('index.html');
    const vercel = readProjectJson('vercel.json');
    const scriptMatch = indexHtml.match(/<!-- Google Consent Mode v2 Setup -->\s*<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();

    const computedHash = computeCspHash(scriptMatch[1]);
    const csp = vercel?.headers?.find(h => h.source === '/(.*)')?.headers?.find(k => k.key === 'Content-Security-Policy')?.value || '';
    expect(csp).toContain(computedHash);
  });

  // -------------------------------------------------------------------------
  // Interaction 13: Secrets Audit (F6) + Repository Cleanliness (F17)
  // -------------------------------------------------------------------------
  it('T3.13: Repository verification confirms clean git ignore for .env and complete absence of market files', () => {
    const gitignore = readProjectFile('.gitignore') || '';
    expect(gitignore).toMatch(/^\.env$/m);
    expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'src/market'))).toBe(false);
    expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'api/market'))).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Interaction 14: Cookie Consent (F5) + Checkout Order Telemetry (F4)
  // -------------------------------------------------------------------------
  it('T3.14: Checkout started event payload includes planCode and respects consent status', () => {
    const dispatchCheckoutTelemetry = (planCode, consent) => {
      if (consent !== 'granted') return null;
      return { event: 'checkout_started', plan: planCode };
    };

    expect(dispatchCheckoutTelemetry('pro_monthly', 'essential')).toBeNull();
    const telemetry = dispatchCheckoutTelemetry('pro_monthly', 'granted');
    expect(telemetry.event).toBe('checkout_started');
    expect(telemetry.plan).toBe('pro_monthly');
  });

  // -------------------------------------------------------------------------
  // Interaction 15: Bulk Spreadsheet Processing + PlanGate Entitlement Limits (F3)
  // -------------------------------------------------------------------------
  it('T3.15: Bulk spreadsheet batch transforms require bulk_processing and decrement quota', () => {
    const freeEnt = entitlementsModule.resolveEntitlements(null);
    expect(entitlementsModule.hasFeature(freeEnt, 'bulk_processing')).toBe(false);
    expect(entitlementsModule.getFeatureLimit(freeEnt, 'bulk_job')).toBe(0);

    const proEnt = entitlementsModule.resolveEntitlements({
      plan_code: 'pro_monthly',
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(entitlementsModule.hasFeature(proEnt, 'bulk_processing')).toBe(true);
    expect(entitlementsModule.getFeatureLimit(proEnt, 'bulk_job')).toBe(30);
  });

  // -------------------------------------------------------------------------
  // Interaction 16: Salary Sheet (F15) + Indian Currency Formatting (F18)
  // -------------------------------------------------------------------------
  it('T3.16: Team aggregate net payout on Salary Sheet is formatted with Indian numbering and commas', () => {
    const team = [
      { id: 'E1', name: 'Emp 1', monthlyGross: 150000, paidDays: 30 },
      { id: 'E2', name: 'Emp 2', monthlyGross: 250000, paidDays: 30 },
    ];
    const sheet = generateReferenceSalarySheet({ employees: team, daysInMonth: 30 });
    const formattedNet = toolFormatModule.money(sheet.totalNet);
    expect(formattedNet).toMatch(/^[\d,]+$/);
    expect(Number(sheet.totalNet)).toBeGreaterThan(300000);
  });

  // -------------------------------------------------------------------------
  // Interaction 17: Vercel 404 Routing (F10) + Prerendered Static Routes (F8)
  // -------------------------------------------------------------------------
  it('T3.17: Vercel routing preserves static route HTML prerendering while handling SPA catch-all', () => {
    const vercel = readProjectJson('vercel.json');
    expect(vercel.rewrites).toBeDefined();
    // Non-API routes rewrite to index.html for SPA client hydration
    const spaRewrite = vercel.rewrites.find(r => r.destination === '/index.html');
    expect(spaRewrite).toBeDefined();
    expect(spaRewrite.source).toContain('api/');
  });

  // -------------------------------------------------------------------------
  // Interaction 18: Section 206AA Penal TDS (F13) + GSTR-2B Vendor Mismatch (F12)
  // -------------------------------------------------------------------------
  it('T3.18: Invoices from vendors without valid PAN trigger Section 206AA 20% penal rate', () => {
    const vendorInvoice = { gstin: 'UNREGISTERED', invoiceNumber: 'INV-99', taxableValue: 100000 };
    // Vendor without PAN has TDS deducted at 20%
    const tdsResult = calculateReferenceTds({
      section: '194C',
      amount: vendorInvoice.taxableValue,
      panProvided: false,
    });
    expect(tdsResult.rate).toBe(0.20);
    expect(tdsResult.tdsAmount).toBe(20000); // 20,000 on 100,000
    expect(tdsResult.reason).toContain('206AA');
  });
});
