/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Component & Hook imports
import { GstInvoice } from '../src/tools/business/GstInvoice';
import BankReconciliation from '../src/tools/business/BankReconciliation';
import ExcelEngineWorkspace from '../src/tools/spreadsheet/ExcelEngineWorkspace';
import { PlanGate } from '../src/components/monetization/PlanGate';
import { FREE_PLAN_STATE } from '../src/lib/monetization/usePlan';
import { getPlan, getPlanPricePaise, getRazorpayPlanId } from '../src/lib/monetization/planCatalog';
import { resolveEntitlements } from '../src/lib/monetization/entitlements';
import * as usePlanModule from '../src/lib/monetization/usePlan';

// Analytics imports
import * as analyticsModule from '../src/lib/analytics';
import * as cookieConsent from '../src/lib/cookieConsent';

// Server entitlement imports
import {
  getBearerToken,
  getUserFromRequest,
  requireEntitlement,
} from '../api/_lib/entitlements';

// Payments & Admin import
import * as paymentsModule from '../api/_lib/payments';

// Endpoint handlers
import createOrderHandler, { parseRequestBody } from '../api/create-order';
import entitlementHandler from '../api/entitlement';
import razorpayWebhookHandler from '../api/webhooks/razorpay';
import crypto from 'crypto';

describe('Adversarial M4 Challenger Test Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GROUP 1: Feature Gating Boundary States & Unrestricted Calculations
  // ────────────────────────────────────────────────────────────────────────────

  describe('Group 1: Feature Gating Boundary States & Unrestricted Calculations', () => {
    it('1.1: GstInvoice allows free on-screen item additions, edits, and tax calculations for unauthenticated visitors', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        ...FREE_PLAN_STATE,
        hasFeature: vi.fn().mockReturnValue(false),
        getLimit: vi.fn().mockReturnValue(0),
        loading: false,
      });

      await act(async () => {
        root.render(
          <BrowserRouter>
            <GstInvoice />
          </BrowserRouter>
        );
      });

      // Verify initial UI elements exist and are interactive
      expect(container.textContent).toContain('GST Invoice Generator');
      expect(container.textContent).toContain('Add Item');

      // Add item via button
      const addItemBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Add Item')
      );
      expect(addItemBtn).toBeTruthy();

      await act(async () => {
        addItemBtn.click();
      });

      // Confirm item row was added and calculation reflects items without paywall
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(1);
      expect(container.textContent).not.toContain('Feature Upgrade Required');
    });

    it('1.2: GstInvoice gates PDF export and Save Workspace, correctly emitting paywall_viewed with specific feature', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        ...FREE_PLAN_STATE,
        hasFeature: vi.fn().mockReturnValue(false),
        getLimit: vi.fn().mockReturnValue(0),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <GstInvoice />
          </BrowserRouter>
        );
      });

      // Click Download PDF -> triggers advanced_exports paywall
      const downloadBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Download PDF')
      );
      await act(async () => {
        downloadBtn.click();
      });

      expect(trackSpy).toHaveBeenCalledWith('advanced_exports');
      expect(container.textContent).toContain('Professional PDF & Excel Exports');
      expect(container.textContent).toContain('All on-screen calculations and tools remain 100% free');

      // Dismiss modal by clicking close button
      const closeBtn = container.querySelector('button[aria-label="Close upgrade prompt"]');
      expect(closeBtn).toBeTruthy();
      await act(async () => {
        closeBtn.click();
      });

      // Click Save Workspace -> triggers saved_workspaces paywall
      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Save Workspace')
      );
      await act(async () => {
        saveBtn.click();
      });

      expect(trackSpy).toHaveBeenCalledWith('saved_workspaces');
      expect(container.textContent).toContain('Saved Cloud Workspaces');
    });

    it('1.3: BankReconciliation allows free interactive reconciliation but gates XLSX report export', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        ...FREE_PLAN_STATE,
        hasFeature: vi.fn().mockReturnValue(false),
        getLimit: vi.fn().mockReturnValue(0),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <BankReconciliation />
          </BrowserRouter>
        );
      });

      // Load sample dataset
      const demoBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Load Sample Dataset')
      );
      expect(demoBtn).toBeTruthy();
      await act(async () => {
        demoBtn.click();
      });

      // Calculations are rendered free on-screen
      expect(container.textContent).toContain('Matched (5)');
      expect(container.textContent).toContain('Closing Balance per Bank Statement₹2,44,990');
      expect(container.textContent).toContain('Adjusted Bank Balance₹2,70,790');

      // Click Export Reconciliation Statement -> blocked by gate
      const exportBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Export Reconciliation Statement')
      );
      expect(exportBtn).toBeTruthy();

      await act(async () => {
        exportBtn.click();
      });

      expect(trackSpy).toHaveBeenCalledWith('advanced_exports');
      expect(container.textContent).toContain('Professional PDF & Excel Exports');
    });

    it('1.4: ExcelEngineWorkspace allows free demo loading & single file processing but gates Batch Process (Bulk)', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        ...FREE_PLAN_STATE,
        hasFeature: vi.fn().mockReturnValue(false),
        getLimit: vi.fn().mockReturnValue(0),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <ExcelEngineWorkspace />
          </BrowserRouter>
        );
      });

      // Load demo sheet
      const demoBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Load Demo Sheet')
      );
      await act(async () => {
        demoBtn.click();
      });

      expect(container.textContent).toContain('Ecommerce_Orders_Demo.xlsx');

      // Click Batch Process (Bulk)
      const batchBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent.includes('Batch Process (Bulk)')
      );
      await act(async () => {
        batchBtn.click();
      });

      expect(trackSpy).toHaveBeenCalledWith('bulk_processing');
      expect(container.textContent).toContain('Batch & Bulk Processing');
    });

    it('1.5: PlanGate renders custom fallback when provided and emits paywall_viewed', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        ...FREE_PLAN_STATE,
        hasFeature: vi.fn().mockReturnValue(false),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <PlanGate
              feature="advanced_exports"
              fallback={<div data-testid="custom-fallback">Custom Upgrade Banner</div>}
            >
              <div data-testid="protected-content">Secret Export Content</div>
            </PlanGate>
          </BrowserRouter>
        );
      });

      expect(container.querySelector('[data-testid="custom-fallback"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="protected-content"]')).toBeNull();
      expect(trackSpy).toHaveBeenCalledWith('advanced_exports');
    });

    it('1.6: PlanGate renders children directly without emitting paywall_viewed when user is entitled', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        plan: 'pro_monthly',
        isPaid: true,
        hasFeature: vi.fn().mockReturnValue(true),
        loading: false,
      });
      const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

      await act(async () => {
        root.render(
          <BrowserRouter>
            <PlanGate feature="advanced_exports">
              <div data-testid="unlocked-content">Unlocked Pro Feature</div>
            </PlanGate>
          </BrowserRouter>
        );
      });

      expect(container.querySelector('[data-testid="unlocked-content"]')).toBeTruthy();
      expect(trackSpy).not.toHaveBeenCalled();
    });

    it('1.7: PlanGate safely handles unknown feature keys without crashing', async () => {
      vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
        ...FREE_PLAN_STATE,
        hasFeature: vi.fn().mockReturnValue(false),
        loading: false,
      });

      await act(async () => {
        root.render(
          <BrowserRouter>
            <PlanGate feature="non_existent_future_feature" />
          </BrowserRouter>
        );
      });

      expect(container.textContent).toContain('Pro Feature Upgrade');
      expect(container.textContent).toContain('Upgrade your OrbitBoard plan to access this capability.');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GROUP 2: Server Entitlements (api/_lib/entitlements.js)
  // ────────────────────────────────────────────────────────────────────────────

  describe('Group 2: Server Entitlements (api/_lib/entitlements.js)', () => {
    it('2.1: getBearerToken extracts token correctly across variations and returns null for invalid formats', () => {
      expect(getBearerToken({ headers: { authorization: 'Bearer abc123def' } })).toBe('abc123def');
      expect(getBearerToken({ headers: { authorization: 'bearer my_token_456' } })).toBe('my_token_456');
      expect(getBearerToken({ headers: { authorization: 'BEARER   spaces_token' } })).toBe('spaces_token');
      expect(getBearerToken({ headers: { authorization: 'Basic dXNlcjpwYXNz' } })).toBeNull();
      expect(getBearerToken({ headers: { authorization: '' } })).toBeNull();
      expect(getBearerToken({ headers: {} })).toBeNull();
      expect(getBearerToken(null)).toBeNull();
      expect(getBearerToken(undefined)).toBeNull();
    });

    it('2.2: getUserFromRequest returns null when token or admin is missing or when auth fails', async () => {
      const mockAdmin = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: null, error: new Error('Invalid JWT') }),
        },
      };

      expect(await getUserFromRequest(null, mockAdmin)).toBeNull();
      expect(await getUserFromRequest({ headers: {} }, mockAdmin)).toBeNull();
      expect(await getUserFromRequest({ headers: { authorization: 'Bearer invalid' } }, null)).toBeNull();
      expect(await getUserFromRequest({ headers: { authorization: 'Bearer invalid' } }, mockAdmin)).toBeNull();

      // Throw inside admin.auth.getUser should be caught safely
      mockAdmin.auth.getUser.mockRejectedValueOnce(new Error('Network failure'));
      expect(await getUserFromRequest({ headers: { authorization: 'Bearer token' } }, mockAdmin)).toBeNull();
    });

    it('2.3: resolveEntitlements marks expired subscriptions as free (1ms boundary testing)', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');

      // Expired by exactly 1 millisecond
      const expiredSub = {
        plan_code: 'pro_monthly',
        status: 'active',
        current_period_end: new Date(now.getTime() - 1).toISOString(),
      };
      const resolvedExpired = resolveEntitlements(expiredSub, now);
      expect(resolvedExpired.planCode).toBe('free');
      expect(resolvedExpired.isPaid).toBe(false);
      expect(resolvedExpired.features.advanced_exports).toBe(false);
      expect(resolvedExpired.features.bulk_processing).toBe(false);

      // Active with 1 millisecond remaining
      const activeSub = {
        plan_code: 'pro_monthly',
        status: 'active',
        current_period_end: new Date(now.getTime() + 1).toISOString(),
      };
      const resolvedActive = resolveEntitlements(activeSub, now);
      expect(resolvedActive.planCode).toBe('pro_monthly');
      expect(resolvedActive.isPaid).toBe(true);
      expect(resolvedActive.features.advanced_exports).toBe(true);
      expect(resolvedActive.features.bulk_processing).toBe(true);
      expect(resolvedActive.features.business_workflows).toBe(false);
    });

    it('2.4: resolveEntitlements handles inactive subscription statuses and invalid plan codes', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      const future = new Date(now.getTime() + 86400000).toISOString();

      // Status not in active set (e.g. past_due, unpaid, paused)
      for (const inactiveStatus of ['past_due', 'unpaid', 'paused', 'created', 'unknown']) {
        const sub = { plan_code: 'pro_monthly', status: inactiveStatus, current_period_end: future };
        const res = resolveEntitlements(sub, now);
        expect(res.planCode).toBe('free');
        expect(res.isPaid).toBe(false);
      }

      // Invalid plan code falling back to free
      const invalidPlanSub = { plan_code: 'enterprise_ultra_unlimited', status: 'active', current_period_end: future };
      const resInvalid = resolveEntitlements(invalidPlanSub, now);
      expect(resInvalid.planCode).toBe('free');
      expect(resInvalid.isPaid).toBe(false);

      // Null or undefined subscription
      expect(resolveEntitlements(null, now).planCode).toBe('free');
      expect(resolveEntitlements(undefined, now).planCode).toBe('free');
    });

    it('2.5: requireEntitlement enforces hierarchical feature access between Free, Pro, and Business', async () => {
      const mockAdminFactory = (planCode, status = 'active') => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: `user_${planCode}` } } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: planCode === 'free' ? null : {
                          plan_code: planCode,
                          status,
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
      });

      const req = { headers: { authorization: 'Bearer token' } };

      // Free user: blocked from advanced_exports
      const freeAdmin = mockAdminFactory('free');
      const resFree = await requireEntitlement(req, freeAdmin, 'advanced_exports');
      expect(resFree.authorized).toBe(false);
      expect(resFree.status).toBe(403);
      expect(resFree.error).toBe('feature_not_entitled');

      // Pro user: allowed for advanced_exports and bulk_processing, blocked from business_workflows
      const proAdmin = mockAdminFactory('pro_monthly');
      const resProExports = await requireEntitlement(req, proAdmin, 'advanced_exports');
      expect(resProExports.authorized).toBe(true);
      expect(resProExports.plan).toBe('pro_monthly');

      const resProWorkflows = await requireEntitlement(req, proAdmin, 'business_workflows');
      expect(resProWorkflows.authorized).toBe(false);
      expect(resProWorkflows.status).toBe(403);

      // Business user: allowed for business_workflows
      const bizAdmin = mockAdminFactory('business_monthly');
      const resBizWorkflows = await requireEntitlement(req, bizAdmin, 'business_workflows');
      expect(resBizWorkflows.authorized).toBe(true);
      expect(resBizWorkflows.plan).toBe('business_monthly');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GROUP 3: Funnel Analytics & Strict Consent Gating (src/lib/analytics.js)
  // ────────────────────────────────────────────────────────────────────────────

  describe('Group 3: Funnel Analytics & Strict Consent Gating', () => {
    beforeEach(() => {
      window.gtag = vi.fn();
    });

    it('3.1: Completely suppresses all funnel events when consent is null, essential, denied, or unknown', () => {
      const trackingCalls = [
        () => analyticsModule.trackToolUsed('gst-invoice'),
        () => analyticsModule.trackInvoiceCreated('INV-001'),
        () => analyticsModule.trackExportClicked('pdf'),
        () => analyticsModule.trackPaywallViewed('advanced_exports'),
        () => analyticsModule.trackCheckoutStarted('pro_monthly'),
        () => analyticsModule.trackSubscriptionActive('pro_monthly'),
      ];

      for (const nonGrantedStatus of [null, 'essential', 'denied', 'revoked', '', 'random_string']) {
        vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue(nonGrantedStatus);

        for (const call of trackingCalls) {
          const res = call();
          expect(res).toBe(false);
          expect(window.gtag).not.toHaveBeenCalled();
        }
      }
    });

    it('3.2: Dispatches all 6 funnel events with correct parameters when consent is granted', () => {
      vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');

      // 1. tool_used
      expect(analyticsModule.trackToolUsed('payslip-generator')).toBe(true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'tool_used', { slug: 'payslip-generator' });

      // 2. invoice_created
      expect(analyticsModule.trackInvoiceCreated('INV-9999')).toBe(true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'invoice_created', { id: 'INV-9999' });

      // 3. export_clicked
      expect(analyticsModule.trackExportClicked('xlsx')).toBe(true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'export_clicked', { format: 'xlsx' });

      // 4. paywall_viewed
      expect(analyticsModule.trackPaywallViewed('bulk_processing')).toBe(true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'paywall_viewed', { feature: 'bulk_processing' });

      // 5. checkout_started
      expect(analyticsModule.trackCheckoutStarted('business_annual')).toBe(true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'checkout_started', { plan: 'business_annual' });

      // 6. subscription_active
      expect(analyticsModule.trackSubscriptionActive('pro_annual')).toBe(true);
      expect(window.gtag).toHaveBeenCalledWith('event', 'subscription_active', { plan: 'pro_annual' });
    });

    it('3.3: Gracefully handles missing window.gtag function when adblockers are active', () => {
      vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');
      delete window.gtag;

      expect(analyticsModule.trackToolUsed('gst-invoice')).toBe(false);
      expect(analyticsModule.trackPaywallViewed('advanced_exports')).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GROUP 4: Donation Flow Isolation from Subscription Logic
  // ────────────────────────────────────────────────────────────────────────────

  describe('Group 4: Donation Flow Isolation from Subscription Logic', () => {
    it('4.1: parseRequestBody accurately parses JSON strings and object bodies', async () => {
      const parsedObj = await parseRequestBody({ body: { productId: 'coffee-orbitboard' } });
      expect(parsedObj.productId).toBe('coffee-orbitboard');

      const parsedStr = await parseRequestBody({ body: JSON.stringify({ productId: 'support-orbitboard' }) });
      expect(parsedStr.productId).toBe('support-orbitboard');

      const parsedInvalid = await parseRequestBody({ body: '{invalid json' });
      expect(parsedInvalid).toEqual({});
    });

    it('4.2: PLAN_CATALOG and price calculations maintain strict INR & paise consistency', () => {
      expect(getPlan('free').amountInr).toBe(0);
      expect(getPlanPricePaise('free')).toBe(0);

      expect(getPlan('pro_monthly').amountInr).toBe(249);
      expect(getPlanPricePaise('pro_monthly')).toBe(24900);

      expect(getPlan('pro_annual').amountInr).toBe(1999);
      expect(getPlanPricePaise('pro_annual')).toBe(199900);

      expect(getPlan('business_monthly').amountInr).toBe(799);
      expect(getPlanPricePaise('business_monthly')).toBe(79900);

      expect(getPlan('business_annual').amountInr).toBe(7999);
      expect(getPlanPricePaise('business_annual')).toBe(799900);

      // Environment variable lookup
      const fakeEnv = {
        RAZORPAY_PLAN_PRO_MONTHLY: 'plan_pro_m_123',
        RAZORPAY_PLAN_BUSINESS_ANNUAL: 'plan_biz_a_456',
      };
      expect(getRazorpayPlanId('pro_monthly', fakeEnv)).toBe('plan_pro_m_123');
      expect(getRazorpayPlanId('business_annual', fakeEnv)).toBe('plan_biz_a_456');
      expect(getRazorpayPlanId('free', fakeEnv)).toBeNull();
    });

    it('4.3: Donation orders and subscription orders operate through segregated validation paths in create-order', async () => {
      const mockRazorpay = {
        orders: {
          create: vi.fn().mockResolvedValue({
            id: 'order_don_123',
            amount: 20000,
            currency: 'INR',
            status: 'created',
          }),
        },
        subscriptions: {
          create: vi.fn().mockResolvedValue({ id: 'sub_123' }),
        },
      };
      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
      };

      vi.spyOn(paymentsModule, 'getRazorpay').mockReturnValue(mockRazorpay);
      vi.spyOn(paymentsModule, 'requireAdmin').mockReturnValue(mockAdmin);

      // Create mock response collector
      const createMockRes = () => {
        const res = {
          statusCode: null,
          headers: {},
          body: '',
          writeHead(status, headers) {
            res.statusCode = status;
            res.headers = headers;
          },
          end(payload) {
            res.body = payload;
          },
        };
        return res;
      };

      // 1. Subscription request without token -> rejected with 401
      const subReqNoToken = {
        method: 'POST',
        headers: { origin: 'http://localhost:5173' },
        body: { planCode: 'pro_monthly' },
      };
      const resSubNoToken = createMockRes();
      await createOrderHandler(subReqNoToken, resSubNoToken);
      expect(resSubNoToken.statusCode).toBe(401);
      expect(JSON.parse(resSubNoToken.body).error).toBe('sign_in_required');

      // 2. Subscription request with free plan -> rejected with 400
      const subReqFree = {
        method: 'POST',
        headers: { origin: 'http://localhost:5173' },
        body: { planCode: 'free' },
      };
      const resSubFree = createMockRes();
      await createOrderHandler(subReqFree, resSubFree);
      expect(resSubFree.statusCode).toBe(400);
      expect(JSON.parse(resSubFree.body).error).toBe('Invalid subscription plan');

      // 3. Donation request (coffee-orbitboard) without token -> proceeds to donation branch without 401
      const donationReq = {
        method: 'POST',
        headers: { origin: 'http://localhost:5173' },
        body: { productId: 'coffee-orbitboard', amountInr: 99 },
      };
      const resDonation = createMockRes();
      await createOrderHandler(donationReq, resDonation);
      expect(resDonation.statusCode).toBe(200);
      const donationBody = JSON.parse(resDonation.body);
      expect(donationBody.order_id).toBe('order_don_123');
      expect(donationBody.amount).toBe(20000);
      expect(donationBody.currency).toBe('INR');
      expect(mockRazorpay.orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9900,
          currency: 'INR',
          notes: { productId: 'coffee-orbitboard' },
        })
      );
      expect(mockRazorpay.subscriptions.create).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GROUP 5: Endpoint & Webhook Robustness and Dynamic Consent Lifecycle
  // ────────────────────────────────────────────────────────────────────────────

  describe('Group 5: Endpoint & Webhook Robustness and Dynamic Consent Lifecycle', () => {
    const createMockRes = () => {
      const res = {
        statusCode: null,
        headers: {},
        body: '',
        writeHead(status, headers) {
          res.statusCode = status;
          res.headers = headers;
        },
        end(payload) {
          res.body = payload || '';
        },
      };
      return res;
    };

    it('5.1: api/entitlement endpoint handles OPTIONS, method filtering, and unauthenticated requests', async () => {
      // 1. OPTIONS request
      const optionsReq = { method: 'OPTIONS', headers: { origin: 'http://localhost:5173' } };
      const optionsRes = createMockRes();
      await entitlementHandler(optionsReq, optionsRes);
      expect(optionsRes.statusCode).toBe(204);

      // 2. Non-GET request (POST)
      const postReq = { method: 'POST', headers: { origin: 'http://localhost:5173' } };
      const postRes = createMockRes();
      await entitlementHandler(postReq, postRes);
      expect(postRes.statusCode).toBe(405);
      expect(JSON.parse(postRes.body).error).toBe('Method not allowed');

      // 3. GET request without auth token
      const mockAdmin = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: null, error: new Error('No token') }) },
      };
      vi.spyOn(paymentsModule, 'requireAdmin').mockReturnValue(mockAdmin);

      const unauthReq = { method: 'GET', headers: { origin: 'http://localhost:5173' } };
      const unauthRes = createMockRes();
      await entitlementHandler(unauthReq, unauthRes);
      expect(unauthRes.statusCode).toBe(401);
      expect(JSON.parse(unauthRes.body).error).toBe('sign_in_required');
    });

    it('5.2: api/entitlement endpoint returns accurate entitlement details for authenticated users', async () => {
      const mockAdmin = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr_pro_99' } } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          plan_code: 'pro_annual',
                          current_period_end: '2027-10-31T00:00:00.000Z',
                          cancel_at_period_end: false,
                          status: 'active',
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
      vi.spyOn(paymentsModule, 'requireAdmin').mockReturnValue(mockAdmin);

      const authReq = {
        method: 'GET',
        headers: {
          origin: 'http://localhost:5173',
          authorization: 'Bearer valid_jwt_token',
        },
      };
      const authRes = createMockRes();
      await entitlementHandler(authReq, authRes);

      expect(authRes.statusCode).toBe(200);
      const data = JSON.parse(authRes.body);
      expect(data.plan).toBe('pro_annual');
      expect(data.plan_code).toBe('pro_annual');
      expect(data.expires_at).toBe('2027-10-31T00:00:00.000Z');
      expect(data.cancel_at_period_end).toBe(false);
      expect(data.status).toBe('active');
    });

    it('5.3: api/webhooks/razorpay strictly verifies HMAC SHA256 signature and rejects spoofed requests', async () => {
      globalThis.process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_secret_12345';

      const payload = JSON.stringify({ event: 'subscription.activated' });
      const badSignature = 'invalid_tampered_signature_hex';

      const asyncIterableReq = (async function* () {
        yield globalThis.Buffer.from(payload);
      })();
      asyncIterableReq.method = 'POST';
      asyncIterableReq.headers = {
        'x-razorpay-signature': badSignature,
      };

      const res = createMockRes();
      await razorpayWebhookHandler(asyncIterableReq, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Invalid signature');
    });

    it('5.4: api/webhooks/razorpay processes valid subscription lifecycle events cleanly', async () => {
      const webhookSecret = 'whsec_valid_test_secret';
      globalThis.process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

      const subEvent = {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: {
              id: 'sub_rzp_999',
              current_start: 1730380800,
              current_end: 1761916800,
            },
          },
        },
      };

      const rawBody = globalThis.Buffer.from(JSON.stringify(subEvent));
      const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      };
      vi.spyOn(paymentsModule, 'requireAdmin').mockReturnValue(mockAdmin);

      const asyncIterableReq = (async function* () {
        yield rawBody;
      })();
      asyncIterableReq.method = 'POST';
      asyncIterableReq.headers = {
        'x-razorpay-signature': validSignature,
      };

      const res = createMockRes();
      await razorpayWebhookHandler(asyncIterableReq, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).accepted).toBe(true);
      expect(JSON.parse(res.body).subscription).toBe('sub_rzp_999');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('5.5: Dynamic consent revocation immediately suppresses analytics tracking', () => {
      window.gtag = vi.fn();

      // Step 1: User initially grants consent
      vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');
      expect(analyticsModule.trackToolUsed('gst-invoice')).toBe(true);
      expect(window.gtag).toHaveBeenCalledTimes(1);

      // Step 2: User revokes consent in preferences dialog
      vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('essential');
      expect(analyticsModule.trackExportClicked('pdf')).toBe(false);
      expect(analyticsModule.trackPaywallViewed('advanced_exports')).toBe(false);
      // gtag count must not have incremented!
      expect(window.gtag).toHaveBeenCalledTimes(1);
    });
  });
});
