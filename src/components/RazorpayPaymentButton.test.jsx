/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RazorpayPaymentButton } from './RazorpayPaymentButton';

describe('RazorpayPaymentButton', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a form containing the Razorpay payment-button script', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RazorpayPaymentButton buttonId="pl_Ts1A8URfk03elY" />);
    });

    const form = container.querySelector('form');
    expect(form).not.toBeNull();

    const script = form.querySelector('script');
    expect(script).not.toBeNull();
    expect(script.src).toBe('https://checkout.razorpay.com/v1/payment-button.js');
    expect(script.getAttribute('data-payment_button_id')).toBe('pl_Ts1A8URfk03elY');
    expect(script.async).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  it('cleans up on unmount without throwing errors', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(<RazorpayPaymentButton buttonId="pl_Ts1A8URfk03elY" />);
    });

    expect(container.querySelector('form')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });

    expect(container.querySelector('form')).toBeNull();
  });
});
