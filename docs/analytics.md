# OrbitBoard Funnel Analytics Documentation

## Overview

OrbitBoard implements privacy-preserving funnel analytics to monitor user engagement, conversion velocity, and monetization paywall effectiveness while strictly respecting user privacy and regulatory requirements.

All analytics tracking is gated by Google Consent Mode v2 and local cookie consent verification (`getConsentStatus() === 'granted'`). If a user has not explicitly consented to analytics cookies, no custom funnel events are dispatched to Google Analytics (`gtag`).

---

## Cookie Consent Enforcement

Before dispatching any analytics event, the tracking client executes:

```javascript
import { getConsentStatus } from './cookieConsent';

export function trackEvent(name, params = {}) {
  if (getConsentStatus() !== 'granted') return false;
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
    return true;
  }
  return false;
}
```

- When consent is `null` or `'essential'`: `trackEvent` immediately drops the event without network calls.
- When consent is `'granted'`: `trackEvent` dispatches the event payload to `window.gtag('event', name, params)`.

---

## Funnel Event Schema & Trigger Sites

OrbitBoard tracks 6 key funnel events along the user monetization and tool activation path:

### 1. `tool_used`
- **Description**: Triggered when a user interacts with or executes calculations on any tool page.
- **Parameters**:
  - `slug` (`string`, required): Canonical identifier of the tool (e.g. `'gst-invoice'`, `'bank-reconciliation'`).
- **Call Sites**:
  - `src/pages/ToolPage.jsx`
  - Tool execution handlers in individual utility workspaces.
- **Example**:
  ```json
  {
    "event": "tool_used",
    "slug": "gst-invoice"
  }
  ```

### 2. `invoice_created`
- **Description**: Triggered when a GST invoice is successfully generated or saved to workspace.
- **Parameters**:
  - `id` (`string`, optional): Unique invoice reference or identifier (omitted if anonymous).
- **Call Sites**:
  - `src/tools/business/GstInvoice.jsx` (upon invoice generation / saving).
- **Example**:
  ```json
  {
    "event": "invoice_created",
    "id": "INV-0001"
  }
  ```

### 3. `export_clicked`
- **Description**: Triggered when a user initiates an export of structured data or report documents.
- **Parameters**:
  - `format` (`string`, required): Format of the exported document (`'pdf'`, `'xlsx'`, `'csv'`, `'json'`).
- **Call Sites**:
  - `src/tools/business/GstInvoice.jsx` (PDF export)
  - `src/tools/business/BankReconciliation.jsx` (XLSX reconciliation report export)
  - `src/tools/spreadsheet/ExcelEngineWorkspace.jsx` (XLSX / CSV export)
- **Example**:
  ```json
  {
    "event": "export_clicked",
    "format": "pdf"
  }
  ```

### 4. `paywall_viewed`
- **Description**: Triggered when a gated feature prompt or pricing comparison is displayed to an unentitled or unauthenticated user.
- **Parameters**:
  - `feature` (`string`, required): Identifier of the feature being gated (e.g. `'advanced_exports'`, `'saved_workspaces'`, `'bulk_processing'`, or `'pricing_page'`).
- **Call Sites**:
  - `src/components/monetization/PlanGate.jsx` (when fallback or upgrade prompt is rendered)
  - `src/pages/Pricing.jsx` (on mount)
- **Example**:
  ```json
  {
    "event": "paywall_viewed",
    "feature": "advanced_exports"
  }
  ```

### 5. `checkout_started`
- **Description**: Triggered when a user initiates a plan subscription checkout from the pricing page or upgrade prompt.
- **Parameters**:
  - `plan` (`string`, required): Plan code being purchased (`'pro_monthly'`, `'pro_annual'`, `'business_monthly'`, `'business_annual'`).
- **Call Sites**:
  - `src/pages/Pricing.jsx` (on subscribe button click)
  - `src/components/monetization/PlanGate.jsx` (when initiating upgrade modal)
- **Example**:
  ```json
  {
    "event": "checkout_started",
    "plan": "pro_monthly"
  }
  ```

### 6. `subscription_active`
- **Description**: Triggered when a subscription payment has been verified and active entitlements are granted.
- **Parameters**:
  - `plan` (`string`, required): Plan code activated (`'pro_monthly'`, `'pro_annual'`, etc.).
- **Call Sites**:
  - Client subscription payment verification handler.
  - Razorpay webhook activation processing.
- **Example**:
  ```json
  {
    "event": "subscription_active",
    "plan": "pro_annual"
  }
  ```

---

## Funnel Conversion Journey

```
[ Visitor Lands on Tool ] ──► tool_used
          │
          ▼
[ Uses Client-Side Tool ] ──► 100% Free on-screen calculations
          │
          ▼
[ Attempts Gated Action ] ──► PDF export / Save / Bulk processing
          │
          ▼
[ Paywall Encountered ] ──► paywall_viewed { feature }
          │
          ▼
[ Visits /pricing Page ] ──► paywall_viewed { feature: 'pricing_page' }
          │
          ▼
[ Clicks Subscribe ] ──► checkout_started { plan }
          │
          ▼
[ Razorpay Success ] ──► subscription_active { plan }
```

---

## Verification & Testing

Unit tests in `src/lib/analytics.test.js` ensure:
1. All tracking methods return `false` without invoking `window.gtag` when cookie consent is `'essential'` or missing (`null`).
2. All tracking methods return `true` and correctly format payloads to `window.gtag('event', ...)` when consent is `'granted'`.
