import { useEffect } from 'react';
import { X, Sparkles, Check, ShieldCheck, Zap } from 'lucide-react';
import { usePro } from '../context/ProContext';
import { RazorpayCheckout } from './RazorpayCheckout';

export function ProUpgradeModal() {
  const { proModal, closeProModal, activatePro } = usePro();

  useEffect(() => {
    if (!proModal.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeProModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proModal.isOpen, closeProModal]);

  if (!proModal.isOpen) return null;

  const handlePaymentSuccess = (payment) => {
    activatePro({
      paymentId: payment?.razorpay_payment_id || '',
      orderId: payment?.razorpay_order_id || '',
      days: 30,
    });

    if (typeof proModal.onUnlock === 'function') {
      try {
        proModal.onUnlock();
      } catch (err) {
        console.warn('[OrbitBoard] Error executing unlock callback', err);
      }
    }

    closeProModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={closeProModal}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xl overflow-hidden z-10 space-y-6">
        {/* Decorative ambient gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-amber-400" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeProModal}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
        >
          <X size={20} />
        </button>

        {/* Header Badge & Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/60 dark:to-indigo-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
            <Sparkles size={13} className="text-violet-600 dark:text-violet-400" />
            <span>OrbitBoard Pro Pass</span>
          </div>

          <h3 id="pro-modal-title" className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            {proModal.toolName ? `Unlimited ${proModal.toolName}` : 'Unlock Unlimited Pro Access'}
          </h3>

          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            You’ve used your 1st free run. Unlock unlimited access to all 20+ PDF, Career, Finance, and Developer tools for 30 days.
          </p>
        </div>

        {/* Price Tag Hero */}
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-gradient-to-br from-violet-50/70 via-stone-50 to-indigo-50/40 dark:from-violet-950/40 dark:via-stone-900 dark:to-indigo-950/30 p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
              30-Day All-Access Pass
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-stone-100">₹19</span>
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">/ month (one-time)</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Less than ₹0.65/day • No recurring surprise debits
            </p>
          </div>

          <div className="shrink-0 text-right">
            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              ⚡ Limited Offer
            </span>
          </div>
        </div>

        {/* Benefits Checklist */}
        <ul className="space-y-2.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300">
          <li className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Check size={13} strokeWidth={3} />
            </span>
            <span><strong>Unlimited usage & exports</strong> on all PDF, Finance & Dev tools</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Zap size={13} strokeWidth={3} />
            </span>
            <span><strong>100% Client-Side Privacy</strong> — your files never leave your device</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <ShieldCheck size={13} strokeWidth={3} />
            </span>
            <span><strong>Zero Ads & Distractions</strong> across all OrbitBoard workspaces</span>
          </li>
        </ul>

        {/* Checkout Button */}
        <div className="pt-2">
          <RazorpayCheckout
            productId="pro-monthly"
            amount={19}
            compact={true}
            buttonText="Unlock All Tools for ₹19 🚀"
            buttonClassName="w-full py-3.5 px-6 min-h-[48px] text-sm font-bold rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-violet-500/20 inline-flex items-center justify-center gap-2"
            title="OrbitBoard Pro"
            description="30-day all-access pass to all 20+ tools"
            onSuccess={handlePaymentSuccess}
          />
          <p className="text-center text-[11px] text-stone-400 dark:text-stone-500 mt-2">
            Instant activation via UPI, GPay, PhonePe, Paytm, Cards & NetBanking
          </p>
        </div>
      </div>
    </div>
  );
}
