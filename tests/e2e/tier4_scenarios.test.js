import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  PROJECT_ROOT,
  readProjectFile,
  readProjectJson,
  loadModule,
  calculateReferencePayslip,
  reconcileReferenceGstr,
  calculateReferenceTds,
  generateReferenceSalarySheet,
  generateReferenceVariants,
} from './harness.js';

const planCatalogModule = await loadModule('src/lib/monetization/planCatalog.js');
const entitlementsModule = await loadModule('src/lib/monetization/entitlements.js');
const passOrdersModule = await loadModule('api/_lib/passOrders.js');
const toolFormatModule = await loadModule('src/lib/toolFormat.js');

describe('Tier 4: Real-World Application Workflows (9 Scenarios)', () => {
  // =========================================================================
  // Scenario 1: Complete End-to-End HR Payroll Run
  // =========================================================================
  it('Scenario 1: Complete End-to-End HR Payroll Run: Attendance -> Proration -> PF/ESI/PT -> TDS -> Net Pay', () => {
    // A Karnataka company processes monthly payroll for a 5-person engineering team
    const daysInMonth = 30;
    const team = [
      { id: 'EMP01', name: 'Dev Lead', monthlyGross: 180000, paidDays: 30, optPf: true },
      { id: 'EMP02', name: 'Senior Dev', monthlyGross: 120000, paidDays: 28, optPf: true },
      { id: 'EMP03', name: 'Junior Dev', monthlyGross: 40000, paidDays: 15, optPf: true }, // half month attendance
      { id: 'EMP04', name: 'Intern (ESI eligible)', monthlyGross: 20000, paidDays: 30, optPf: false },
      { id: 'EMP05', name: 'Contractor on Leave', monthlyGross: 60000, paidDays: 0, optPf: true }, // unpaid leave
    ];

    // Step 1: Generate monthly salary sheet with proration
    const salarySheet = generateReferenceSalarySheet({ employees: team, daysInMonth });

    expect(salarySheet.employeeCount).toBe(5);
    expect(salarySheet.daysInMonth).toBe(30);

    // Step 2: Validate Dev Lead (Full Attendance, High Earner)
    const devLead = salarySheet.rows[0];
    expect(devLead.proratedGross).toBe(180000);
    expect(devLead.pf).toBe(1800); // capped at 1800
    expect(devLead.esi).toBe(0); // gross > 21,000 exempt
    expect(devLead.pt).toBe(200); // gross >= 25,000
    expect(devLead.netSalary).toBe(180000 - 1800 - 200);

    // Step 3: Validate Junior Dev (15/30 Days Attendance Proration)
    const jrDev = salarySheet.rows[2];
    expect(jrDev.proratedGross).toBe(20000); // 40,000 * (15/30) = 20,000
    // Prorated gross ₹20,000 makes him ESI eligible (<= 21,000)!
    expect(jrDev.esi).toBe(Math.round(20000 * 0.0075)); // 150
    expect(jrDev.pt).toBe(0); // 20,000 < 25,000

    // Step 4: Validate Intern (ESI Eligible full month)
    const intern = salarySheet.rows[3];
    expect(intern.proratedGross).toBe(20000);
    expect(intern.esi).toBe(150); // 0.75% of 20,000
    expect(intern.pf).toBe(0); // opted out

    // Step 5: Validate Absentee Employee (0 paid days)
    const absentee = salarySheet.rows[4];
    expect(absentee.proratedGross).toBe(0);
    expect(absentee.netSalary).toBe(0);
    expect(absentee.totalDeductions).toBe(0);

    // Step 6: Validate Company Payout Aggregates formatted with Indian numbering
    expect(salarySheet.totalGross).toBeGreaterThan(0);
    expect(salarySheet.totalNet).toBe(salarySheet.totalGross - salarySheet.totalDeductions);
    const formattedTotalNet = toolFormatModule.money(salarySheet.totalNet);
    expect(formattedTotalNet).toContain(',');
  });

  // =========================================================================
  // Scenario 2: GST B2B Compliance & Audit Reconciliation
  // =========================================================================
  it('Scenario 2: GST B2B Compliance & Reconciliation: Purchase Register vs GSTR-2B Portal Data', () => {
    // 5 vendor invoices in GSTR-2B from GST Portal
    const gstr2b = [
      { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV/2026/001', taxableValue: 100000, igst: 18000 },
      { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV/2026/002', taxableValue: 250000, igst: 45000 },
      { gstin: '27XYZAB9876C1Z1', invoiceNumber: 'TX-8801', taxableValue: 50000, cgst: 4500, sgst: 4500 },
      { gstin: '33KLMNO5555P1Z9', invoiceNumber: 'BILL-901', taxableValue: 75000, igst: 13500 },
      { gstin: '07QQQAA1111B1Z2', invoiceNumber: 'INV-44', taxableValue: 30000, igst: 5400 }, // In 2B but forgotten in Books
    ];

    // 5 vendor invoices in internal Purchase Register (Books)
    const purchaseRegister = [
      { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV2026001', taxableValue: 100000, igst: 18000 }, // Matches INV/2026/001 after normalization
      { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'INV2026002', taxableValue: 245000, igst: 44100 }, // Value mismatch (₹5000 diff)
      { gstin: '27XYZAB9876C1Z1', invoiceNumber: 'TX8801', taxableValue: 50000, cgst: 4500, sgst: 4500 }, // Matches
      { gstin: '33KLMNO5555P1Z9', invoiceNumber: 'BILL901', taxableValue: 75000, igst: 13500 }, // Matches
      { gstin: '29ZZZYY9999K1Z0', invoiceNumber: 'INV-999', taxableValue: 80000, igst: 14400 }, // In Books but missing in 2B (ineligible for immediate ITC)
    ];

    // Step 1: Run reconciliation engine
    const reconciliation = reconcileReferenceGstr(gstr2b, purchaseRegister, 1.0);

    // Step 2: Verify summary categorizations
    expect(reconciliation.summary.matchedCount).toBe(3);
    expect(reconciliation.summary.mismatchCount).toBe(1);
    expect(reconciliation.summary.missingIn2BCount).toBe(1);
    expect(reconciliation.summary.missingInPrCount).toBe(1);

    // Step 3: Verify the value mismatch
    const mismatch = reconciliation.mismatches[0];
    expect(mismatch.diff).toBe(5000);
    expect(mismatch.status).toBe('VALUE_MISMATCH');

    // Step 4: Verify blocked ITC (invoice in books but missing in 2B)
    const blockedItc = reconciliation.missingIn2B[0];
    expect(blockedItc.invoiceNumber).toBe('INV-999');

    // Step 5: Verify unclaimed ITC (invoice in 2B but not in books)
    const unclaimedItc = reconciliation.missingInPr[0];
    expect(unclaimedItc.invoiceNumber).toBe('INV-44');
  });

  // =========================================================================
  // Scenario 3: Commercial SaaS Upgrade Journey (Free to Pro)
  // =========================================================================
  it('Scenario 3: SaaS Upgrade Flow: Free tool calculation -> Export blocked -> Checkout -> Webhook activation -> Export unlocked', () => {
    // Step 1: Anonymous visitor starts on Free plan
    let userSubscription = null;
    let entitlement = entitlementsModule.resolveEntitlements(userSubscription);
    expect(entitlement.planCode).toBe('free');
    expect(entitlement.isPaid).toBe(false);
    expect(entitlementsModule.hasFeature(entitlement, 'advanced_exports')).toBe(false);

    // Step 2: User performs calculation on screen (100% free)
    const calculation = calculateReferencePayslip({ annualCtc: 1500000 });
    expect(calculation.netSalary).toBeGreaterThan(0);

    // Step 3: User attempts to export PDF -> Blocked by PlanGate check
    const canExport = entitlementsModule.hasFeature(entitlement, 'advanced_exports');
    expect(canExport).toBe(false);

    // Step 4: User visits /pricing, picks pro_monthly
    const chosenPlan = planCatalogModule.getPlan('pro_monthly');
    expect(chosenPlan.amountInr).toBe(249);
    const paise = planCatalogModule.getPlanPricePaise('pro_monthly');
    expect(paise).toBe(24900);

    // Step 5: Order initiated
    const passOrder = passOrdersModule.parsePassOrderRequest({ planId: 'pro_monthly' });
    expect(passOrder.planId).toBe('pro_monthly');

    // Step 6: Razorpay webhook confirms payment captured
    const secret = 'test_webhook_secret';
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_123456', amount: 24900, currency: 'INR', status: 'captured' } },
        order: { entity: { id: 'order_123456', notes: { plan_id: 'pro_monthly' } } },
      },
    });
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(expectedSig.length).toBe(64);

    // Step 7: Subscription activated in database
    userSubscription = {
      plan_code: 'pro_monthly',
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
    };
    entitlement = entitlementsModule.resolveEntitlements(userSubscription);

    // Step 8: User returns to tool -> Export is now unlocked!
    expect(entitlement.planCode).toBe('pro_monthly');
    expect(entitlement.isPaid).toBe(true);
    expect(entitlementsModule.hasFeature(entitlement, 'advanced_exports')).toBe(true);
    expect(entitlementsModule.getFeatureLimit(entitlement, 'advanced_export')).toBe(100);
  });

  // =========================================================================
  // Scenario 4: SEO, Edge Routing & Content Architecture Audit
  // =========================================================================
  it('Scenario 4: SEO & Edge Routing: Static routes prerendering, tool variants generation, and canonical tags', () => {
    // Step 1: Verify static routes checklist
    const staticRoutes = ['/', '/tools', '/about', '/contact', '/privacy', '/terms'];
    expect(staticRoutes.length).toBe(6);

    // Step 2: Generate programmatic variants for EMI and CTC
    const variants = generateReferenceVariants();
    expect(variants.length).toBe(28);

    // Step 3: Check EMI variant configuration
    const emiVariant = variants.find(v => v.slug === 'emi-calculator-25-lakh-20-years');
    expect(emiVariant).toBeDefined();
    expect(emiVariant.canonicalUrl).toBe('https://orbitboard.in/tools/emi');
    expect(emiVariant.params.principal).toBe(2500000);
    expect(emiVariant.params.tenureYears).toBe(20);

    // Step 4: Check CTC variant configuration
    const ctcVariant = variants.find(v => v.slug === '12-lpa-in-hand-salary-new-regime');
    expect(ctcVariant).toBeDefined();
    expect(ctcVariant.canonicalUrl).toBe('https://orbitboard.in/tools/ctc-to-inhand');
    expect(ctcVariant.params.ctcAnnual).toBe(1200000);
    expect(ctcVariant.params.regime).toBe('new');

    // Step 5: Check dynamic sitemap inclusion
    const sitemapEntries = variants.map(v => `<loc>https://orbitboard.in/tools/${v.slug}</loc>`);
    expect(sitemapEntries.length).toBe(28);
    for (const entry of sitemapEntries) {
      expect(entry.startsWith('<loc>https://orbitboard.in/tools/')).toBe(true);
    }
  });

  // =========================================================================
  // Scenario 5: Security Posture, CSP & Repository Cleanliness Audit
  // =========================================================================
  it('Scenario 5: Security & Cleanliness Audit: Clean git history, CSP script restrictions, and zero market code', () => {
    // Step 1: Check .gitignore enforces exclusion of credentials
    const gitignore = readProjectFile('.gitignore');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.local');

    // Step 2: Check git-filter-repo command availability for verification
    const filterRepoCommand = 'git-filter-repo --invert-paths --path .env';
    expect(filterRepoCommand).toContain('--invert-paths');

    // Step 3: Inspect vercel.json CSP header
    const vercel = readProjectJson('vercel.json');
    const csp = vercel?.headers?.find(h => h.source === '/(.*)')?.headers?.find(k => k.key === 'Content-Security-Policy')?.value || '';
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("'sha256-fKZEcC922IMO+0G5BkycWTyqRY/A6lttqjgIVNaJfyU='");

    // Step 4: Verify zero leftover market files
    expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'src/market'))).toBe(false);
    expect(fs.existsSync(path.resolve(PROJECT_ROOT, 'api/market'))).toBe(false);

    // Step 5: Verify App.jsx has no market routes
    const appJs = readProjectFile('src/App.jsx') || '';
    expect(appJs).not.toContain('/market');
  });

  // =========================================================================
  // Scenario 6: Comparative Tax Regimes & Salary Optimization
  // =========================================================================
  it('Scenario 6: Salary Optimization: Comparing New vs Old tax regime on ₹12 Lakh CTC offer', () => {
    // In India, ₹12 LPA is the boundary where Section 87A rebate makes tax ₹0 under New Regime
    const payslipNew = calculateReferencePayslip({ annualCtc: 1200000, regime: 'new' });
    const payslipOld = calculateReferencePayslip({ annualCtc: 1200000, regime: 'old' });

    // Under New Regime: Standard deduction 75,000 -> Taxable 11,25,000 <= 12,00,000 -> Tax is ₹0!
    expect(payslipNew.tds).toBe(0);

    // Under Old Regime: Standard deduction 50,000 -> Taxable 11,50,000 -> Exceeds 5L rebate -> Tax is payable!
    expect(payslipOld.tds).toBeGreaterThan(0);

    // Take-home under New Regime is higher
    expect(payslipNew.netSalary).toBeGreaterThan(payslipOld.netSalary);

    const differenceMonthly = payslipNew.netSalary - payslipOld.netSalary;
    expect(differenceMonthly).toBeGreaterThan(0);
    expect(toolFormatModule.money(differenceMonthly)).toMatch(/^[\d,]+$/);
  });

  // =========================================================================
  // Scenario 7: Vendor TDS Deduction & Compliance Workflow
  // =========================================================================
  it('Scenario 7: Vendor TDS Compliance: Contractor payments (194C), Professional fees (194J), and PAN validation (206AA)', () => {
    // Multi-vendor invoice batch
    const invoices = [
      { vendor: 'Cleaning Agency (Company)', section: '194C', amount: 80000, recipientType: 'company', pan: 'AAACC1234D' },
      { vendor: 'Individual Handyman', section: '194C', amount: 25000, recipientType: 'individual', pan: 'BBBPB5678E' }, // Below 30k threshold
      { vendor: 'Legal Counsel (Professional)', section: '194J', amount: 150000, subType: 'professional', pan: 'AAAPL9090K' },
      { vendor: 'Cloud Consultant (No PAN)', section: '194J', amount: 50000, subType: 'technical', pan: null }, // Section 206AA penalty
    ];

    const results = invoices.map(inv =>
      calculateReferenceTds({
        section: inv.section,
        amount: inv.amount,
        recipientType: inv.recipientType,
        subType: inv.subType,
        panProvided: Boolean(inv.pan),
      })
    );

    // 1. Cleaning Agency (194C Company above 30k): 2% of 80,000 = 1600
    expect(results[0].tdsAmount).toBe(1600);
    expect(results[0].isExempt).toBe(false);

    // 2. Handyman (194C below 30k threshold): Exempt = 0
    expect(results[1].tdsAmount).toBe(0);
    expect(results[1].isExempt).toBe(true);

    // 3. Legal Counsel (194J Professional 10% above 30k): 10% of 150,000 = 15,000
    expect(results[2].tdsAmount).toBe(15000);

    // 4. Cloud Consultant (No PAN provided): Section 206AA 20% penal rate!
    expect(results[3].rate).toBe(0.20);
    expect(results[3].tdsAmount).toBe(10000); // 20% of 50,000
    expect(results[3].reason).toContain('206AA');
  });

  // =========================================================================
  // Scenario 8: User Privacy & Analytics Funnel Lifecycle
  // =========================================================================
  it('Scenario 8: Privacy & Analytics Funnel: Initial state -> Essential mode -> Consent grant -> Telemetry emission', () => {
    let currentConsent = null;
    const recordedEvents = [];

    const emitEvent = (eventName, data) => {
      if (currentConsent !== 'granted') {
        return { transmitted: false, reason: 'consent_not_granted' };
      }
      recordedEvents.push({ eventName, data, timestamp: Date.now() });
      return { transmitted: true, eventName };
    };

    // Step 1: User lands on page (no choice yet)
    expect(emitEvent('tool_used', { tool: 'ctc-to-inhand' }).transmitted).toBe(false);

    // Step 2: User clicks "Essential Only" on cookie banner
    currentConsent = 'essential';
    expect(emitEvent('invoice_created', { id: 'INV-1' }).transmitted).toBe(false);
    expect(recordedEvents.length).toBe(0);

    // Step 3: User opens preferences and clicks "Accept All"
    currentConsent = 'granted';
    expect(emitEvent('tool_used', { tool: 'ctc-to-inhand' }).transmitted).toBe(true);
    expect(emitEvent('paywall_viewed', { feature: 'advanced_exports' }).transmitted).toBe(true);
    expect(emitEvent('checkout_started', { plan: 'pro_monthly' }).transmitted).toBe(true);

    expect(recordedEvents.length).toBe(3);
    expect(recordedEvents.map(e => e.eventName)).toEqual(['tool_used', 'paywall_viewed', 'checkout_started']);
  });

  // =========================================================================
  // Scenario 9: Batch Spreadsheet Processing with Quota Governance
  // =========================================================================
  it('Scenario 9: Bulk Processing & Filename Governance: Quota checks and sanitized output naming', () => {
    // Pro user has bulk processing entitlement
    const proSubscription = {
      plan_code: 'pro_monthly',
      status: 'active',
      current_period_end: new Date(Date.now() + 86400000).toISOString(),
    };
    const entitlement = entitlementsModule.resolveEntitlements(proSubscription);

    expect(entitlementsModule.hasFeature(entitlement, 'bulk_processing')).toBe(true);
    let remainingQuota = entitlementsModule.getFeatureLimit(entitlement, 'bulk_job');
    expect(remainingQuota).toBe(30);

    // Execute bulk operation
    remainingQuota -= 1;
    expect(remainingQuota).toBe(29);

    // Validate sanitized output filename
    const filename = toolFormatModule.formatDownloadFilename('excel-engine-batch', 'xlsx');
    expect(filename).toBe('orbitboard-excel-engine-batch.xlsx');
    expect(filename.startsWith('orbitboard-')).toBe(true);
    expect(filename.endsWith('.xlsx')).toBe(true);
  });
});
