import { useEffect, useRef } from 'react';

/**
 * Razorpay Embedded Payment Button
 * Renders an official Razorpay payment button via payment-button.js script.
 * 
 * Default Button ID provided: pl_Ts1A8URfk03elY
 */
export function RazorpayPaymentButton({
  buttonId = 'pl_Ts1A8URfk03elY',
  className = '',
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset container to avoid duplicate buttons during React component remounts
    container.innerHTML = '';

    const form = document.createElement('form');
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
    script.setAttribute('data-payment_button_id', buttonId);
    script.async = true;

    form.appendChild(script);
    container.appendChild(form);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [buttonId]);

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center justify-center min-h-[44px] ${className}`}
      data-testid="razorpay-payment-button-container"
    />
  );
}

export default RazorpayPaymentButton;
