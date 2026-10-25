import { useState, useCallback, useMemo } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { loadRazorpayScript } from '../lib/razorpay';

// Default presets
const DEFAULT_AMOUNT_OPTIONS = [100, 500, 1000];
const COFFEE_AMOUNT_OPTIONS = [49, 99, 199];

export function RazorpayCheckout({
  productId = 'support-orbitboard',
  amount = 500, // Default selection in INR.
  amountOptions,
  title = 'OrbitBoard Pro Access',
  description = 'Support OrbitBoard & unlock Pro features',
  prefillName = '',
  prefillEmail = '',
  prefillContact = '',
  onSuccess,
  onError,
  onCancel,
  buttonText,
  buttonClassName,
  showAmountSelector = false,
  compact = false,
}) {
  const effectiveOptions = useMemo(() => {
    return amountOptions || (productId === 'coffee-orbitboard' ? COFFEE_AMOUNT_OPTIONS : DEFAULT_AMOUNT_OPTIONS);
  }, [amountOptions, productId]);
  const [selectedAmount, setSelectedAmount] = useState(
    effectiveOptions.includes(amount) ? amount : effectiveOptions[0]
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error' | 'info', message: string, details?: object }

  const handleCheckout = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    try {
      // Step 1: Ensure Razorpay SDK is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      const keyId = await (async () => {
        if (import.meta.env.VITE_RAZORPAY_KEY_ID) {
          return import.meta.env.VITE_RAZORPAY_KEY_ID;
        }
        const resp = await fetch('/api/razorpay-key');
        if (!resp.ok) throw new Error('Unable to fetch Razorpay public key');
        const { key } = await resp.json();
        return key;
      })();
      if (!keyId) {
        throw new Error('Razorpay Key ID is not configured (public key fetch failed).');
      }

      const effectiveProductId = productId || 'support-orbitboard';
      if (!effectiveOptions.includes(selectedAmount)) {
        throw new Error('Please choose one of the listed amounts.');
      }

      // Step 2: Create order via backend. The server sets the price and currency.
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: effectiveProductId,
          amount: selectedAmount * 100,
          amountInr: selectedAmount,
          currency: 'INR',
        }),
      });

      const orderData = await response.json();

      if (!response.ok || orderData.error) {
        throw new Error(orderData.error || `Failed to create order (${response.status})`);
      }

      const { order_id, amount: orderAmount, currency: orderCurrency } = orderData;

      // Step 4: Open Razorpay modal with order_id
      const options = {
        key: keyId,
        amount: orderAmount,
        currency: orderCurrency,
        name: 'OrbitBoard',
        description,
        order_id,
        prefill: {
          name: prefillName,
          email: prefillEmail,
          contact: prefillContact,
        },
        theme: {
          color: '#7c3aed',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            const cancelStatus = {
              type: 'info',
              message: 'Checkout cancelled by user.',
            };
            setStatus(cancelStatus);
            if (onCancel) onCancel();
          },
        },
        handler: async (paymentResponse) => {
          setLoading(true);
          try {
            // Step 5: Send razorpay_payment_id, razorpay_order_id, and razorpay_signature to backend verify endpoint
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              const successStatus = {
                type: 'success',
                message: 'Payment verified successfully!',
                details: {
                  paymentId: paymentResponse.razorpay_payment_id,
                  orderId: paymentResponse.razorpay_order_id,
                },
              };
              setStatus(successStatus);
              if (onSuccess) onSuccess(verifyData, paymentResponse);
            } else {
              const errorMsg = verifyData.error || 'Payment signature verification failed.';
              const failStatus = {
                type: 'error',
                message: errorMsg,
              };
              setStatus(failStatus);
              if (onError) onError(new Error(errorMsg));
            }
          } catch (err) {
            const verifyErrorMsg = err?.message || 'Failed to verify payment';
            setStatus({ type: 'error', message: verifyErrorMsg });
            if (onError) onError(err);
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (failData) => {
        setLoading(false);
        const failureReason = failData.error?.description || 'Payment process failed.';
        const failStatus = {
          type: 'error',
          message: failureReason,
          details: failData.error,
        };
        setStatus(failStatus);
        if (onError) onError(failData.error || new Error(failureReason));
      });

      rzp.open();
      setLoading(false);
    } catch (err) {
      setLoading(false);
      const errMsg = err?.message || 'An error occurred during checkout.';
      setStatus({ type: 'error', message: errMsg });
      if (onError) onError(err);
    }
  }, [
    productId,
    selectedAmount,
    description,
    prefillName,
    prefillEmail,
    prefillContact,
    onSuccess,
    onError,
    onCancel,
    effectiveOptions,
  ]);

  if (compact) {
    const computedButtonText = buttonText
      ? buttonText.replace(/₹\d+/, `₹${selectedAmount}`)
      : `Pay ₹${selectedAmount} with Razorpay`;

    return (
      <div className="flex flex-col items-center sm:items-end gap-2">
        {showAmountSelector && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Select coffee amount">
            {effectiveOptions.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSelectedAmount(preset)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                  selectedAmount === preset
                    ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-500 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className={
            buttonClassName ||
            'shrink-0 px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-50'
          }
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Opening…</span>
            </>
          ) : (
            <span>{computedButtonText}</span>
          )}
        </button>

        {status && (
          <div
            className={`text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
              status.type === 'success'
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                : status.type === 'error'
                ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60'
                : 'text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800'
            }`}
          >
            {status.type === 'success' && <CheckCircle2 size={13} className="text-emerald-600" />}
            {status.type === 'error' && <AlertCircle size={13} className="text-rose-600" />}
            <span>{status.message}</span>
            <button
              type="button"
              onClick={() => setStatus(null)}
              className="opacity-60 hover:opacity-100 ml-1 p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 shadow-xs">
      <div className="flex items-center gap-3 border-b border-[var(--orbit-border)] pb-4 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-300">
          <CreditCard size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{title}</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">{description}</p>
        </div>
      </div>

      {showAmountSelector && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
            Select Amount (₹)
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {effectiveOptions.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSelectedAmount(preset)}
                className={`py-2 px-3 min-h-[44px] rounded-xl text-xs font-bold transition border ${
                  selectedAmount === preset
                    ? 'border-accent-600 bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300'
                    : 'border-stone-200 dark:border-stone-700 hover:border-accent-300 text-stone-700 dark:text-stone-300'
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={
          buttonClassName ||
          'w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 dark:bg-accent-500 hover:bg-accent-700 dark:hover:bg-accent-600 text-white font-bold text-sm shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Processing Order…</span>
          </>
        ) : (
          <>
            <CreditCard size={18} />
            <span>{buttonText || `Pay ₹${selectedAmount} with Razorpay`}</span>
          </>
        )}
      </button>

      {status && (
        <div
          className={`mt-4 p-3.5 rounded-xl border text-xs font-medium relative flex items-start gap-2.5 ${
            status.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : status.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}
        >
          {status.type === 'success' && <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />}
          {status.type === 'error' && <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />}
          {status.type === 'info' && <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />}

          <div className="flex-1 pr-4">
            <p className="font-semibold">{status.message}</p>
            {status.details?.paymentId && (
              <p className="mt-1 text-[11px] opacity-80">
                Payment ID: <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">{status.details.paymentId}</code>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStatus(null)}
            className="absolute top-3 right-3 text-current opacity-60 hover:opacity-100 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
