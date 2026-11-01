/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Pricing from '../src/pages/Pricing';
import * as usePlanModule from '../src/lib/monetization/usePlan';
import * as analyticsModule from '../src/lib/analytics';
import { PLAN_CATALOG } from '../src/lib/monetization/planCatalog';

describe('Pricing Page (/pricing)', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.restoreAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders dynamic plan cards from PLAN_CATALOG and fires paywall_viewed event', async () => {
    vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
      plan: 'free',
      isPaid: false,
      refresh: vi.fn(),
    });
    const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

    await act(async () => {
      root.render(
        <BrowserRouter>
          <Pricing />
        </BrowserRouter>
      );
    });

    expect(trackSpy).toHaveBeenCalledWith('pricing_page');
    expect(container.textContent).toContain('Pick the Right Plan for Your Workflow');

    // Free plan card
    expect(container.textContent).toContain('Free');
    expect(container.textContent).toContain('₹0');

    // Pro Annual plan card (default billing interval is annual)
    expect(container.textContent).toContain(PLAN_CATALOG.pro_annual.name);
    expect(container.textContent).toContain(`₹${PLAN_CATALOG.pro_annual.amountInr.toLocaleString('en-IN')}`);
    expect(container.textContent).toContain('Save 33%');

    // Business Annual plan card
    expect(container.textContent).toContain(PLAN_CATALOG.business_annual.name);
    expect(container.textContent).toContain(`₹${PLAN_CATALOG.business_annual.amountInr.toLocaleString('en-IN')}`);

    // Reassurance promise
    expect(container.textContent).toContain('Client-Side Calculation Promise');
  });

  it('toggles between annual and monthly pricing displays', async () => {
    vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
      plan: 'free',
      isPaid: false,
      refresh: vi.fn(),
    });

    await act(async () => {
      root.render(
        <BrowserRouter>
          <Pricing />
        </BrowserRouter>
      );
    });

    // Default annual displays ₹1,999 for Pro
    expect(container.textContent).toContain(`₹${PLAN_CATALOG.pro_annual.amountInr.toLocaleString('en-IN')}`);

    // Click Monthly Billing toggle
    const monthlyBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Monthly Billing')
    );
    expect(monthlyBtn).toBeTruthy();

    await act(async () => {
      monthlyBtn.click();
    });

    // Monthly displays ₹249 for Pro and ₹799 for Business
    expect(container.textContent).toContain(`₹${PLAN_CATALOG.pro_monthly.amountInr.toLocaleString('en-IN')}`);
    expect(container.textContent).toContain(`₹${PLAN_CATALOG.business_monthly.amountInr.toLocaleString('en-IN')}`);
  });

  it('triggers checkout_started event when subscribe is clicked', async () => {
    vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
      plan: 'free',
      isPaid: false,
      refresh: vi.fn(),
    });
    const checkoutSpy = vi.spyOn(analyticsModule, 'trackCheckoutStarted');

    await act(async () => {
      root.render(
        <BrowserRouter>
          <Pricing />
        </BrowserRouter>
      );
    });

    const subscribeBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Subscribe to Pro')
    );
    expect(subscribeBtn).toBeTruthy();

    await act(async () => {
      subscribeBtn.click();
    });

    expect(checkoutSpy).toHaveBeenCalledWith('pro_annual');
  });
});
