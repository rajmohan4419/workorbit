/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ProProvider, usePro } from './ProContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function TestConsumer({ onMount }) {
  const pro = usePro();
  onMount(pro);
  return null;
}

describe('ProContext', () => {
  let container;
  let root;

  beforeEach(() => {
    localStorage.clear();
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

  it('allows 1st usage for free when not pro', () => {
    let proRef;
    act(() => {
      root.render(
        <ProProvider>
          <TestConsumer onMount={(val) => { proRef = val; }} />
        </ProProvider>
      );
    });

    expect(proRef.isPro).toBe(false);
    expect(proRef.getUsage('merge-pdf')).toBe(0);
    expect(proRef.canExecute('merge-pdf')).toBe(true);

    act(() => {
      proRef.recordUsage('merge-pdf');
    });

    expect(proRef.getUsage('merge-pdf')).toBe(1);
    expect(proRef.canExecute('merge-pdf')).toBe(false);
  });

  it('activates Pro and allows unlimited usages for all tools', () => {
    let proRef;
    act(() => {
      root.render(
        <ProProvider>
          <TestConsumer onMount={(val) => { proRef = val; }} />
        </ProProvider>
      );
    });

    // Used once
    act(() => {
      proRef.recordUsage('merge-pdf');
    });
    expect(proRef.canExecute('merge-pdf')).toBe(false);

    // Activate pro
    act(() => {
      proRef.activatePro({ orderId: 'order_123', paymentId: 'pay_123', days: 30 });
    });

    expect(proRef.isPro).toBe(true);
    expect(proRef.daysRemaining).toBe(30);
    expect(proRef.canExecute('merge-pdf')).toBe(true);
    expect(proRef.canExecute('another-tool')).toBe(true);
  });

  it('triggers pro modal on 2nd usage via executeWithProGate', () => {
    let proRef;
    act(() => {
      root.render(
        <ProProvider>
          <TestConsumer onMount={(val) => { proRef = val; }} />
        </ProProvider>
      );
    });

    const actionMock = vi.fn();

    // 1st run should execute
    act(() => {
      proRef.executeWithProGate('split-pdf', actionMock, { toolName: 'Split PDF' });
    });
    expect(actionMock).toHaveBeenCalledTimes(1);
    expect(proRef.proModal.isOpen).toBe(false);

    // 2nd run should open modal instead of executing
    actionMock.mockClear();
    act(() => {
      proRef.executeWithProGate('split-pdf', actionMock, { toolName: 'Split PDF' });
    });
    expect(actionMock).not.toHaveBeenCalled();
    expect(proRef.proModal.isOpen).toBe(true);
    expect(proRef.proModal.toolSlug).toBe('split-pdf');
  });
});
