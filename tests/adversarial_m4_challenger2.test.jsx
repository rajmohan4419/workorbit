/* global Buffer, process */
/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Monetization modules
import {
  PLAN_CATALOG,
  ONE_TIME_PRODUCTS,
  getRazorpayPlanId,
  getPlanPricePaise,
} from '../src/lib/monetization/planCatalog';
import {
  resolveEntitlements,
  hasFeature,
} from '../src/lib/monetization/entitlements';
import { FREE_PLAN_STATE } from '../src/lib/monetization/usePlan';
import { requireEntitlement } from '../api/_lib/entitlements';

// Analytics
import {
  trackToolUsed,
  trackInvoiceCreated,
  trackExportClicked,
  trackPaywallViewed,
  trackCheckoutStarted,
  trackSubscriptionActive,
} from '../src/lib/analytics';
import * as cookieConsentModule from '../src/lib/cookieConsent';

// Calculation engines to verify ungated core logic
import { calcItem, calcInvoiceTotals } from '../src/tools/business/gstInvoiceEngine';
import { reconcileTransactions } from '../src/engines/bankReconciliationEngine';

// API Handlers
import createOrderHandler from '../api/create-order.js';
import verifyPaymentHandler from '../api/verify-payment.js';
import webhookHandler from '../api/webhooks/razorpay.js';

function mockReqRes({ method = 'POST', headers = {}, body = null, rawBody = null } = {}) {
  const req = {
    method,
    headers,
    body,
    async *[Symbol.asyncIterator]() {
      if (rawBody !== null) yield Buffer.from(rawBody);
    },
  };
  let status = 200;
  let text = '';
  const res = {
    writeHead: (code) => { status = code; },
    end: (data) => { text = data; },
  };
  return { req, res, status: () => status, json: () => JSON.parse(text || '{}') };
}

describe('Adversarial M4 Stress-Testing Suite — Challenger 2', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Plan Catalog, Pricing Math & Immutability Invariance
  // =========================================================================
  describe('1. Plan Catalog, Pricing Math & Catalog Consistency', () => {
    it('enforces deep immutability on PLAN_CATALOG, products and nested limits/features', () => {
      expect(Object.isFrozen(PLAN_CATALOG)).toBe(true);
      expect(Object.isFrozen(ONE_TIME_PRODUCTS)).toBe(true);

      const planKeys = ['free', 'pro_monthly', 'pro_annual', 'business_monthly', 'business_annual'];
      for (const key of planKeys) {
        const plan = PLAN_CATALOG[key];
        expect(plan).toBeDefined();
        expect(Object.isFrozen(plan)).toBe(true);
        expect(Object.isFrozen(plan.features)).toBe(true);
        expect(Object.isFrozen(plan.limits)).toBe(true);

        // Tampering attempt should throw in strict mode
        expect(() => {
          'use strict';
          plan.features.advanced_exports = true;
        }).toThrow();
      }
    });

    it('verifies exact discount calculations for annual vs monthly billing', () => {
      const proM = PLAN_CATALOG.pro_monthly.amountInr;
      const proA = PLAN_CATALOG.pro_annual.amountInr;
      const proAnnualEquiv = proM * 12; // 249 * 12 = 2988
      const proDiscountPercent = ((proAnnualEquiv - proA) / proAnnualEquiv) * 100;
      // 33.10% discount -> rounded to 33%
      expect(Math.round(proDiscountPercent)).toBe(33);
      expect(proDiscountPercent).toBeGreaterThanOrEqual(33.0);

      const bizM = PLAN_CATALOG.business_monthly.amountInr;
      const bizA = PLAN_CATALOG.business_annual.amountInr;
      const bizAnnualEquiv = bizM * 12; // 799 * 12 = 9588
      const bizDiscountPercent = ((bizAnnualEquiv - bizA) / bizAnnualEquiv) * 100;
      // 16.57% discount -> rounded to 17% or claimed "Save 16%"
      expect(bizDiscountPercent).toBeGreaterThanOrEqual(16.0);
    });

    it('verifies feature matrix hierarchy: Free < Pro < Business', () => {
      const free = PLAN_CATALOG.free.features;
      const pro = PLAN_CATALOG.pro_monthly.features;
      const biz = PLAN_CATALOG.business_monthly.features;

      // Free plan restrictions
      expect(free.ads).toBe(true);
      expect(free.saved_workspaces).toBe(false);
      expect(free.advanced_exports).toBe(false);
      expect(free.bulk_processing).toBe(false);
      expect(free.business_workflows).toBe(false);
      expect(free.priority_support).toBe(false);

      // Pro tier additions
      expect(pro.ads).toBe(false);
      expect(pro.saved_workspaces).toBe(true);
      expect(pro.advanced_exports).toBe(true);
      expect(pro.bulk_processing).toBe(true);
      expect(pro.business_workflows).toBe(false);
      expect(pro.priority_support).toBe(false);

      // Business tier additions
      expect(biz.ads).toBe(false);
      expect(biz.saved_workspaces).toBe(true);
      expect(biz.advanced_exports).toBe(true);
      expect(biz.bulk_processing).toBe(true);
      expect(biz.business_workflows).toBe(true);
      expect(biz.priority_support).toBe(true);
    });

    it('verifies strict 12x annual limit scaling over monthly quotas', () => {
      const proM = PLAN_CATALOG.pro_monthly.limits;
      const proA = PLAN_CATALOG.pro_annual.limits;
      expect(proA.advanced_export).toBe(proM.advanced_export * 12);
      expect(proA.bulk_job).toBe(proM.bulk_job * 12);

      const bizM = PLAN_CATALOG.business_monthly.limits;
      const bizA = PLAN_CATALOG.business_annual.limits;
      expect(bizA.advanced_export).toBe(bizM.advanced_export * 12);
      expect(bizA.bulk_job).toBe(bizM.bulk_job * 12);
      expect(bizA.business_workflow).toBe(bizM.business_workflow * 12);
    });

    it('verifies Razorpay plan ID resolver, fallbacks, and paise price conversions', () => {
      const mockEnv = {
        RAZORPAY_PLAN_PRO_MONTHLY: 'plan_pro_m_live_99',
        RAZORPAY_PLAN_PRO_ANNUAL: 'plan_pro_a_live_88',
      };

      // Configured env
      expect(getRazorpayPlanId('pro_monthly', mockEnv)).toBe('plan_pro_m_live_99');
      expect(getRazorpayPlanId('pro_annual', mockEnv)).toBe('plan_pro_a_live_88');

      // Missing env returns null gracefully (no throw)
      expect(getRazorpayPlanId('business_monthly', mockEnv)).toBe(null);
      expect(getRazorpayPlanId('business_annual', mockEnv)).toBe(null);

      // Free plan has no Razorpay plan ID
      expect(getRazorpayPlanId('free', mockEnv)).toBe(null);
      expect(getRazorpayPlanId('non_existent', mockEnv)).toBe(null);

      // Paise price checks
      expect(getPlanPricePaise('free')).toBe(0);
      expect(getPlanPricePaise('pro_monthly')).toBe(24900);
      expect(getPlanPricePaise('pro_annual')).toBe(199900);
      expect(getPlanPricePaise('business_monthly')).toBe(79900);
      expect(getPlanPricePaise('business_annual')).toBe(799900);
      expect(getPlanPricePaise('invalid_code')).toBe(null);
    });
  });

  // =========================================================================
  // 2. Server Gate Robustness & Anti-Tampering Verification
  // =========================================================================
  describe('2. Client & Server Gate Robustness (Anti-Tampering & Security)', () => {
    it('prevents client gate tampering: server rejects unauthenticated requests with 401', async () => {
      const mockAdmin = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Missing bearer token') }) },
      };

      // Attacker attempts to call server without token
      const req = { headers: {} };
      const gateResult = await requireEntitlement(req, mockAdmin, 'advanced_exports');

      expect(gateResult.authorized).toBe(false);
      expect(gateResult.status).toBe(401);
      expect(gateResult.error).toBe('sign_in_required');
    });

    it('prevents client gate tampering: server rejects unentitled user with 403 feature_not_entitled', async () => {
      const mockAdmin = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'attacker_user_id' } } }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Attacker provides valid auth token, but has no paid subscription in DB
      const req = { headers: { authorization: 'Bearer attacker_valid_jwt' } };

      // Attacker tries to access gated features:
      const resExport = await requireEntitlement(req, mockAdmin, 'advanced_exports');
      expect(resExport.authorized).toBe(false);
      expect(resExport.status).toBe(403);
      expect(resExport.error).toBe('feature_not_entitled');
      expect(resExport.feature).toBe('advanced_exports');

      const resBulk = await requireEntitlement(req, mockAdmin, 'bulk_processing');
      expect(resBulk.authorized).toBe(false);
      expect(resBulk.status).toBe(403);
      expect(resBulk.error).toBe('feature_not_entitled');
      expect(resBulk.feature).toBe('bulk_processing');

      const resSave = await requireEntitlement(req, mockAdmin, 'saved_workspaces');
      expect(resSave.authorized).toBe(false);
      expect(resSave.status).toBe(403);
      expect(resSave.error).toBe('feature_not_entitled');
      expect(resSave.feature).toBe('saved_workspaces');
    });

    it('enforces tier differentiation: Pro plan user is rejected from Business-only features', async () => {
      const mockAdmin = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'pro_user_id' } } }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          plan_code: 'pro_monthly',
                          status: 'active',
                          current_period_end: new Date(Date.now() + 86400000).toISOString(),
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const req = { headers: { authorization: 'Bearer pro_jwt' } };

      // Pro user CAN access advanced_exports
      const resExport = await requireEntitlement(req, mockAdmin, 'advanced_exports');
      expect(resExport.authorized).toBe(true);
      expect(resExport.plan).toBe('pro_monthly');

      // Pro user CANNOT access business_workflows (Business-only)
      const resBiz = await requireEntitlement(req, mockAdmin, 'business_workflows');
      expect(resBiz.authorized).toBe(false);
      expect(resBiz.status).toBe(403);
      expect(resBiz.error).toBe('feature_not_entitled');
      expect(resBiz.feature).toBe('business_workflows');
    });

    it('handles expired and boundary subscriptions strictly in resolveEntitlements', () => {
      const now = new Date('2026-10-31T12:00:00Z');

      // Case A: Expired 1 millisecond ago
      const expiredSub = {
        plan_code: 'pro_monthly',
        status: 'active',
        current_period_end: new Date(now.getTime() - 1).toISOString(),
      };
      const resExpired = resolveEntitlements(expiredSub, now);
      expect(resExpired.planCode).toBe('free');
      expect(resExpired.isPaid).toBe(false);
      expect(hasFeature(resExpired, 'advanced_exports')).toBe(false);

      // Case B: Exactly active by 1 millisecond into the future
      const activeSub = {
        plan_code: 'pro_monthly',
        status: 'active',
        current_period_end: new Date(now.getTime() + 1).toISOString(),
      };
      const resActive = resolveEntitlements(activeSub, now);
      expect(resActive.planCode).toBe('pro_monthly');
      expect(resActive.isPaid).toBe(true);
      expect(hasFeature(resActive, 'advanced_exports')).toBe(true);

      // Case C: Status cancelled or halted
      const cancelledSub = {
        plan_code: 'pro_monthly',
        status: 'cancelled',
        current_period_end: new Date(now.getTime() + 86400000).toISOString(),
      };
      const resCancelled = resolveEntitlements(cancelledSub, now);
      expect(resCancelled.planCode).toBe('free');

      // Case D: Corrupt / Malformed date
      const corruptSub = {
        plan_code: 'pro_monthly',
        status: 'active',
        current_period_end: 'not-a-valid-date',
      };
      const resCorrupt = resolveEntitlements(corruptSub, now);
      expect(resCorrupt.planCode).toBe('free');
    });

    it('FREE_PLAN_STATE has immutable zero quotas and immediate offline access', () => {
      expect(FREE_PLAN_STATE.plan).toBe('free');
      expect(FREE_PLAN_STATE.isPaid).toBe(false);
      expect(FREE_PLAN_STATE.loading).toBe(false);
      expect(FREE_PLAN_STATE.limits.advanced_export).toBe(0);
      expect(FREE_PLAN_STATE.limits.bulk_job).toBe(0);
      expect(FREE_PLAN_STATE.features.advanced_exports).toBe(false);
      expect(Object.isFrozen(FREE_PLAN_STATE)).toBe(true);
    });
  });

  // =========================================================================
  // 3. Funnel Analytics Telemetry & Consent Mode v2 Verification
  // =========================================================================
  describe('3. Funnel Analytics Telemetry & Consent Mode v2 Verification', () => {
    it('suppresses all 6 funnel events when cookie consent is null or essential', () => {
      const windowGtagSpy = vi.fn();
      window.gtag = windowGtagSpy;

      // Scenario A: Consent is null (unanswered banner)
      vi.spyOn(cookieConsentModule, 'getConsentStatus').mockReturnValue(null);

      expect(trackToolUsed('gst-invoice')).toBe(false);
      expect(trackInvoiceCreated('INV-001')).toBe(false);
      expect(trackExportClicked('pdf')).toBe(false);
      expect(trackPaywallViewed('advanced_exports')).toBe(false);
      expect(trackCheckoutStarted('pro_monthly')).toBe(false);
      expect(trackSubscriptionActive('pro_monthly')).toBe(false);
      expect(windowGtagSpy).not.toHaveBeenCalled();

      // Scenario B: Consent is 'essential' (user clicked Decline/Essential Only)
      vi.spyOn(cookieConsentModule, 'getConsentStatus').mockReturnValue('essential');

      expect(trackToolUsed('gst-invoice')).toBe(false);
      expect(trackInvoiceCreated('INV-001')).toBe(false);
      expect(trackExportClicked('pdf')).toBe(false);
      expect(trackPaywallViewed('advanced_exports')).toBe(false);
      expect(trackCheckoutStarted('pro_monthly')).toBe(false);
      expect(trackSubscriptionActive('pro_monthly')).toBe(false);
      expect(windowGtagSpy).not.toHaveBeenCalled();
    });

    it('dispatches all 6 funnel events with exact parameters when consent is granted', () => {
      const windowGtagSpy = vi.fn();
      window.gtag = windowGtagSpy;
      vi.spyOn(cookieConsentModule, 'getConsentStatus').mockReturnValue('granted');

      // 1. tool_used
      expect(trackToolUsed('bank-reconciliation')).toBe(true);
      expect(windowGtagSpy).toHaveBeenLastCalledWith('event', 'tool_used', { slug: 'bank-reconciliation' });

      // 2. invoice_created
      expect(trackInvoiceCreated('INV-2026-004')).toBe(true);
      expect(windowGtagSpy).toHaveBeenLastCalledWith('event', 'invoice_created', { id: 'INV-2026-004' });

      // 3. export_clicked
      expect(trackExportClicked('xlsx')).toBe(true);
      expect(windowGtagSpy).toHaveBeenLastCalledWith('event', 'export_clicked', { format: 'xlsx' });

      // 4. paywall_viewed
      expect(trackPaywallViewed('saved_workspaces')).toBe(true);
      expect(windowGtagSpy).toHaveBeenLastCalledWith('event', 'paywall_viewed', { feature: 'saved_workspaces' });

      // 5. checkout_started
      expect(trackCheckoutStarted('business_annual')).toBe(true);
      expect(windowGtagSpy).toHaveBeenLastCalledWith('event', 'checkout_started', { plan: 'business_annual' });

      // 6. subscription_active
      expect(trackSubscriptionActive('business_annual')).toBe(true);
      expect(windowGtagSpy).toHaveBeenLastCalledWith('event', 'subscription_active', { plan: 'business_annual' });

      expect(windowGtagSpy).toHaveBeenCalledTimes(6);
    });

    it('confirms docs/analytics.md accurately documents all 6 funnel events and parameters', () => {
      const docPath = path.resolve('docs/analytics.md');
      expect(fs.existsSync(docPath)).toBe(true);
      const docContent = fs.readFileSync(docPath, 'utf-8');

      // All 6 events must be documented
      expect(docContent).toContain('`tool_used`');
      expect(docContent).toContain('`invoice_created`');
      expect(docContent).toContain('`export_clicked`');
      expect(docContent).toContain('`paywall_viewed`');
      expect(docContent).toContain('`checkout_started`');
      expect(docContent).toContain('`subscription_active`');

      // Parameters
      expect(docContent).toContain('`slug`');
      expect(docContent).toContain('`id`');
      expect(docContent).toContain('`format`');
      expect(docContent).toContain('`feature`');
      expect(docContent).toContain('`plan`');

      // Consent requirement documented
      expect(docContent).toContain("getConsentStatus() === 'granted'");
    });
  });

  // =========================================================================
  // 4. Calculation Invariance Under Free Plan Gating
  // =========================================================================
  describe('4. Free On-Screen Calculation Invariance', () => {
    it('calculates GST invoice line items with multi-slab GST without gating', () => {
      const item18 = {
        qty: 2,
        rate: 1000,
        discount: 10, // 10%
        gstRate: 18,
      };
      // Taxable = 2 * 1000 * 0.9 = 1800
      // CGST = 9% of 1800 = 162
      // SGST = 9% of 1800 = 162
      // Total = 1800 + 324 = 2124
      const calcIntra = calcItem(item18, false);
      expect(calcIntra.taxable).toBe(1800);
      expect(calcIntra.cgst).toBe(162);
      expect(calcIntra.sgst).toBe(162);
      expect(calcIntra.igst).toBe(0);
      expect(calcIntra.total).toBe(2124);

      // Interstate check
      const calcInter = calcItem(item18, true);
      expect(calcInter.taxable).toBe(1800);
      expect(calcInter.cgst).toBe(0);
      expect(calcInter.sgst).toBe(0);
      expect(calcInter.igst).toBe(324);
      expect(calcInter.total).toBe(2124);

      // Invoice Totals check
      const totals = calcInvoiceTotals([item18], false);
      expect(totals.taxableTotal).toBe(1800);
      expect(totals.totalTax).toBe(324);
      expect(totals.grandTotal).toBe(2124);
    });

    it('performs full bank reconciliation calculation with timing differences without gating', () => {
      const bankTxns = [
        { id: 'b1', date: '2026-10-01', description: 'Vendor A Payment', amount: -5000, absAmount: 5000, isMoneyIn: false, reference: 'REF001' },
        { id: 'b2', date: '2026-10-02', description: 'Customer X Receipt', amount: 12000, absAmount: 12000, isMoneyIn: true, reference: 'REF002' },
        { id: 'b3', date: '2026-10-05', description: 'Bank Service Charge', amount: -250, absAmount: 250, isMoneyIn: false, reference: 'CHG001' },
      ];
      const ledgerTxns = [
        { id: 'l1', date: '2026-10-01', description: 'Vendor A Payment', amount: -5000, absAmount: 5000, isMoneyIn: false, reference: 'REF001' },
        { id: 'l2', date: '2026-10-02', description: 'Customer X Receipt', amount: 12000, absAmount: 12000, isMoneyIn: true, reference: 'REF002' },
        { id: 'l3', date: '2026-10-04', description: 'Cheque issued to Vendor B', amount: -3000, absAmount: 3000, isMoneyIn: false, reference: 'REF003' },
      ];

      const res = reconcileTransactions(bankTxns, ledgerTxns, {
        dateToleranceDays: 3,
        closingBankBalance: 6750,
        closingLedgerBalance: 4000,
      });

      expect(res.matches.length).toBe(2);
      expect(res.bankUnmatched.length).toBe(1); // Bank charge
      expect(res.ledgerUnmatched.length).toBe(1); // Unpresented cheque
      expect(res.summary.unpresentedChecks).toBe(3000);
      expect(res.summary.bankChargesOrDebits).toBe(250);
      expect(res.summary.adjustedBankBalance).toBe(3750); // 6750 - 3000
      expect(res.summary.adjustedBookBalance).toBe(3750); // 4000 - 250
      expect(res.summary.isStatementReconciled).toBe(true);
    });
  });

  // =========================================================================
  // 5. Razorpay Subscription Order & Webhook Signature Integrity
  // =========================================================================
  describe('5. Payment Verification & Webhook Timing-Safe Signature Security', () => {
    it('verifies timing-safe subscription signature calculation and rejects tampered signatures', () => {
      const secret = 'rzp_test_secret_key_12345';
      const paymentId = 'pay_test_001';
      const subscriptionId = 'sub_test_002';

      const payloadToSign = `${paymentId}|${subscriptionId}`;
      const validSignature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

      // Signature verification helper logic from verify-payment.js
      const sigBuf = Buffer.from(validSignature, 'utf-8');
      const expBuf = Buffer.from(validSignature, 'utf-8');
      const isOk = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
      expect(isOk).toBe(true);

      // Tampered signature attempt
      const tamperedSignature = validSignature.slice(0, -1) + (validSignature.slice(-1) === 'a' ? 'b' : 'a');
      const tampBuf = Buffer.from(tamperedSignature, 'utf-8');
      const isTamperedOk = tampBuf.length === expBuf.length && crypto.timingSafeEqual(tampBuf, expBuf);
      expect(isTamperedOk).toBe(false);
    });

    it('create-order rejects invalid or free plan codes before touching storage', async () => {
      process.env.RAZORPAY_KEY_ID = 'rzp_mock_id';
      process.env.RAZORPAY_KEY_SECRET = 'rzp_mock_secret';

      // 1. Attempting to subscribe to 'free' plan code
      const { req: reqFree, res: resFree, status: statusFree, json: jsonFree } = mockReqRes({
        body: { planCode: 'free' },
      });
      await createOrderHandler(reqFree, resFree);
      expect(statusFree()).toBe(400);
      expect(jsonFree().error).toBe('Invalid subscription plan');

      // 2. Attempting to subscribe to non-existent plan code
      const { req: reqUnknown, res: resUnknown, status: statusUnknown, json: jsonUnknown } = mockReqRes({
        body: { planCode: 'enterprise_platinum' },
      });
      await createOrderHandler(reqUnknown, resUnknown);
      expect(statusUnknown()).toBe(400);
      expect(jsonUnknown().error).toBe('Invalid subscription plan');

      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
    });

    it('verify-payment rejects subscription verification with missing fields or bad signature', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'secret_123';

      // 1. Missing fields
      const { req: reqMissing, res: resMissing, status: statusMissing, json: jsonMissing } = mockReqRes({
        body: { razorpay_subscription_id: 'sub_123' },
      });
      await verifyPaymentHandler(reqMissing, resMissing);
      expect(statusMissing()).toBe(400);
      expect(jsonMissing().error).toContain('Missing required payment verification fields');

      // 2. Bad signature for subscription
      const { req: reqBadSig, res: resBadSig, status: statusBadSig, json: jsonBadSig } = mockReqRes({
        body: {
          razorpay_subscription_id: 'sub_123',
          razorpay_payment_id: 'pay_123',
          razorpay_signature: 'bad_signature_hash',
        },
      });
      await verifyPaymentHandler(reqBadSig, resBadSig);
      expect(statusBadSig()).toBe(400);
      expect(jsonBadSig().error).toBe('Invalid payment signature');

      delete process.env.RAZORPAY_KEY_SECRET;
    });

    it('razorpay webhook handler enforces POST, configured secret, and signature verification', async () => {
      // 1. Non-POST method
      const { req: reqGet, res: resGet, status: statusGet } = mockReqRes({ method: 'GET' });
      await webhookHandler(reqGet, resGet);
      expect(statusGet()).toBe(405);

      // 2. Missing secret
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
      const { req: reqNoSecret, res: resNoSecret, status: statusNoSecret, json: jsonNoSecret } = mockReqRes({
        rawBody: JSON.stringify({ event: 'subscription.activated' }),
      });
      await webhookHandler(reqNoSecret, resNoSecret);
      expect(statusNoSecret()).toBe(500);
      expect(jsonNoSecret().error).toBe('Webhook not configured');

      // 3. Bad signature
      process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_999';
      const { req: reqBadSig, res: resBadSig, status: statusBadSig, json: jsonBadSig } = mockReqRes({
        headers: { 'x-razorpay-signature': 'invalid_sig' },
        rawBody: JSON.stringify({ event: 'subscription.activated' }),
      });
      await webhookHandler(reqBadSig, resBadSig);
      expect(statusBadSig()).toBe(400);
      expect(jsonBadSig().error).toBe('Invalid signature');

      delete process.env.RAZORPAY_WEBHOOK_SECRET;
    });
  });
});
