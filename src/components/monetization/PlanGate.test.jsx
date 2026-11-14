/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PlanGate } from './PlanGate';
import * as usePlanModule from '../../lib/monetization/usePlan';
import * as analyticsModule from '../../lib/analytics';

describe('<PlanGate /> Component', () => {
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

  it('renders children when feature is entitled', async () => {
    vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
      hasFeature: vi.fn().mockReturnValue(true),
      loading: false,
    });
    const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

    await act(async () => {
      root.render(
        <BrowserRouter>
          <PlanGate feature="advanced_exports">
            <div id="protected-content">Secret Content</div>
          </PlanGate>
        </BrowserRouter>
      );
    });

    expect(container.querySelector('#protected-content')).toBeTruthy();
    expect(container.textContent).toContain('Secret Content');
    expect(trackSpy).not.toHaveBeenCalled();
  });

  it('renders fallback when unentitled and fallback prop is provided', async () => {
    vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
      hasFeature: vi.fn().mockReturnValue(false),
      loading: false,
    });
    const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

    await act(async () => {
      root.render(
        <BrowserRouter>
          <PlanGate
            feature="saved_workspaces"
            fallback={<div id="custom-fallback">Custom Fallback</div>}
          >
            <div id="protected-content">Secret Content</div>
          </PlanGate>
        </BrowserRouter>
      );
    });

    expect(container.querySelector('#protected-content')).toBeNull();
    expect(container.querySelector('#custom-fallback')).toBeTruthy();
    expect(trackSpy).toHaveBeenCalledWith('saved_workspaces');
  });

  it('renders account-first prompt without a pricing redirect when unentitled', async () => {
    vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
      hasFeature: vi.fn().mockReturnValue(false),
      loading: false,
    });
    const trackSpy = vi.spyOn(analyticsModule, 'trackPaywallViewed');

    await act(async () => {
      root.render(
        <BrowserRouter>
          <PlanGate feature="advanced_exports">
            <div>Protected Content</div>
          </PlanGate>
        </BrowserRouter>
      );
    });

    expect(trackSpy).toHaveBeenCalledWith('advanced_exports');
    expect(container.textContent).toContain('Sign up for PDF & Excel downloads');
    expect(container.textContent).toContain('Free on-screen use · No sign-up required');
    const link = container.querySelector('a[href="/account"]');
    expect(link).toBeTruthy();
  });

  it('accepts custom title and description props', async () => {
    vi.spyOn(usePlanModule, 'usePlan').mockReturnValue({
      hasFeature: vi.fn().mockReturnValue(false),
      loading: false,
    });

    await act(async () => {
      root.render(
        <BrowserRouter>
          <PlanGate
            feature="bulk_processing"
            title="Custom Bulk Header"
            description="Custom Bulk Explanation"
          >
            <div>Protected Content</div>
          </PlanGate>
        </BrowserRouter>
      );
    });

    expect(container.textContent).toContain('Custom Bulk Header');
    expect(container.textContent).toContain('Custom Bulk Explanation');
  });
});
