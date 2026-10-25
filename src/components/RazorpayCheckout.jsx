import { useState, useCallback } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { loadRazorpayScript } from '../lib/razorpay';

export function RazorpayCheckout({
  amount = 500, // Amount in INR (e.g. 500 = ₹500)
  currency = 'INR',
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
}) {
  const [selectedAmount, setSelectedAmount] = useState(amount);
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

      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) {
        throw new Error('Razorpay Key ID is not configured in VITE_RAZORPAY_KEY_ID.');
      }

      // Step 2: Convert INR to paise (minimum 100 paise = ₹1)
      const amountInPaise = Math.round(Number(selectedAmount) * 100);
      if (amountInPaise < 100) {
        throw new Error('Minimum payment amount is ₹1 (100 paise).');
      }

      // Step 3: Create order via backend endpoint
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          notes: {
            title,
          },
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
    selectedAmount,
    currency,
    title,
    description,
    prefillName,
    prefillEmail,
    prefillContact,
    onSuccess,
    onError,
    onCancel,
  ]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 shadow-xs">
      <div className="flex items-center gap-3 border-b border-[var(--orbit-border)] pb-4 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
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
            {[100, 500, 1000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSelectedAmount(preset)}
                className={`py-2 px-3 min-h-[44px] rounded-xl text-xs font-bold transition border ${
                  selectedAmount === preset
                    ? 'border-violet-600 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
                    : 'border-stone-200 dark:border-stone-700 hover:border-violet-300 text-stone-700 dark:text-stone-300'
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 font-semibold">₹</span>
            <input
              type="number"
              min="1"
              value={selectedAmount}
              onChange={(e) => setSelectedAmount(Math.max(1, Number(e.target.value)))}
              className="w-full pl-8 pr-3 py-2 min-h-[44px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-semibold text-stone-900 dark:text-stone-100 outline-none focus:border-violet-500"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={
          buttonClassName ||
          'w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 dark:bg-violet-500 hover:bg-violet-700 dark:hover:bg-violet-600 text-white font-bold text-sm shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed'
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
