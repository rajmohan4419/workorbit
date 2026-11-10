/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ShareResultModal } from './ShareResultModal';

describe('ShareResultModal Component', () => {
  let container;
  let root;

  const mockTool = {
    slug: 'income-tax-india',
    name: 'India Income Tax Calculator',
    category: 'Finance',
  };

  const mockSharePayload = {
    headlineMetric: '₹ 1,12,500 Total Tax',
    subMetrics: [
      { label: 'Taxable Income', value: '₹ 14,25,000' },
      { label: 'Regime', value: 'New (115BAC)' },
      { label: 'Effective Rate', value: '7.5%' },
    ],
    summaryText: 'Estimated total income tax of ₹ 1,12,500 on OrbitBoard',
    queryParams: { income: '1500000', regime: 'new' },
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', async () => {
    await act(async () => {
      root.render(
        <ShareResultModal
          isOpen={false}
          onClose={vi.fn()}
          tool={mockTool}
          sharePayload={mockSharePayload}
        />
      );
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders modal with title, social buttons, and preview when isOpen is true', async () => {
    await act(async () => {
      root.render(
        <ShareResultModal
          isOpen={true}
          onClose={vi.fn()}
          tool={mockTool}
          sharePayload={mockSharePayload}
        />
      );
    });

    expect(container.textContent).toContain('Share Result Scorecard');
    expect(container.textContent).toContain('WhatsApp');
    expect(container.textContent).toContain('X (Twitter)');
    expect(container.textContent).toContain('LinkedIn');
    expect(container.textContent).toContain('Telegram');
    expect(container.textContent).toContain('Copy Image (Paste to Social)');
    expect(container.textContent).toContain('Download Card (PNG)');
    expect(container.textContent).toContain('Copy Link');
  });

  it('copies link when Copy Link button is clicked', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    await act(async () => {
      root.render(
        <ShareResultModal
          isOpen={true}
          onClose={vi.fn()}
          tool={mockTool}
          sharePayload={mockSharePayload}
        />
      );
    });

    const copyBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent.includes('Copy Link')
    );
    expect(copyBtn).toBeTruthy();

    await act(async () => {
      copyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockWriteText).toHaveBeenCalled();
    expect(container.textContent).toContain('Copied!');
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    await act(async () => {
      root.render(
        <ShareResultModal
          isOpen={true}
          onClose={handleClose}
          tool={mockTool}
          sharePayload={mockSharePayload}
        />
      );
    });

    const closeBtn = container.querySelector('button[aria-label="Close modal"]');
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
