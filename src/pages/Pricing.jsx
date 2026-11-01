import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';
import { PLAN_CATALOG } from '../lib/monetization/planCatalog';
import { usePlan } from '../lib/monetization/usePlan';
import { supabase } from '../lib/supabase';
import { loadRazorpayScript } from '../lib/razorpay';
import {
  trackPaywallViewed,
  trackCheckoutStarted,
  trackSubscriptionActive,
} from '../lib/analytics';

export default function Pricing() {
  const [billingInterval, setBillingInterval] = useState('annual'); // 'monthly' | 'annual'
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: string }

  const { plan: currentPlanCode, isPaid, refresh } = usePlan();

  useEffect(() => {
    document.title = 'Plans & Pricing | OrbitBoard Pro';
    window.scrollTo(0, 0);
    trackPaywallViewed('pricing_page');
  }, []);

  const handleSubscribe = useCallback(async (baseTier) => {
    setStatusMessage(null);

    if (baseTier === 'free') {
      setStatusMessage({ type: 'info', text: 'You are currently using the Free tier. All tools remain 100% free!' });
      return;
    }

    const planCode = `${baseTier}_${billingInterval}`;
    const plan = PLAN_CATALOG[planCode];
    if (!plan) {
      setStatusMessage({ type: 'error', text: 'Invalid plan selected.' });
      return;
    }

    setLoadingPlan(planCode);
    trackCheckoutStarted(planCode);

    try {
      // Step 1: Check authentication
      if (!supabase?.auth) {
        throw new Error('Authentication service is unavailable. Please check your connection.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session || !session.access_token) {
        setStatusMessage({
          type: 'info',
          text: 'Please sign in or create an account to activate a Pro or Business subscription.',
        });
        setLoadingPlan(null);
        return;
      }

      // Step 2: Load Razorpay SDK
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) {
        throw new Error('Failed to load payment gateway SDK. Please check your internet connection.');
      }

      // Step 3: Create subscription order via backend
      const resp = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planCode }),
      });

      const orderData = await resp.json();
      if (!resp.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to initiate checkout.');
      }

      const keyId = orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_key';
      const subscriptionId = orderData.subscription_id;

      // Step 4: Open Razorpay modal
      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'OrbitBoard',
        description: `${plan.name} (${billingInterval})`,
        handler: async (paymentResponse) => {
          setLoadingPlan(planCode);
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_subscription_id: paymentResponse.razorpay_subscription_id || subscriptionId,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              trackSubscriptionActive(planCode);
              setStatusMessage({
                type: 'success',
                text: `Welcome to ${plan.name}! Your subscription is active.`,
              });
              await refresh();
            } else {
              throw new Error(verifyData.error || 'Subscription verification failed.');
            }
          } catch (err) {
            setStatusMessage({ type: 'error', text: err.message || 'Payment verification failed.' });
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
            setStatusMessage({ type: 'info', text: 'Checkout was cancelled.' });
          },
        },
        theme: { color: '#7c3aed' },
      };

      if (typeof window !== 'undefined' && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Razorpay client not ready.');
      }
    } catch (err) {
      console.error('[Pricing subscribe error]', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to start checkout.' });
      setLoadingPlan(null);
    }
  }, [billingInterval, refresh]);

  // Dynamic plan card data
  const proPlan = billingInterval === 'annual' ? PLAN_CATALOG.pro_annual : PLAN_CATALOG.pro_monthly;
  const businessPlan = billingInterval === 'annual' ? PLAN_CATALOG.business_annual : PLAN_CATALOG.business_monthly;

  const tiers = [
    {
      key: 'free',
      name: 'Free',
      badge: null,
      priceDisplay: '₹0',
      periodDisplay: 'forever',
      savingsPill: null,
      description: 'Ideal for everyday work, quick personal calculations, and lightweight file conversions.',
      features: [
        'All on-screen calculations 100% free',
        'Complete client-side privacy & zero logs',
        'Instant web browser performance',
        'Interactive preview for all utilities',
        'Standard community support',
      ],
      limitations: [
        'Single-file operations only',
        'Ad-supported experience',
        'Cloud workspaces disabled',
        'Advanced document exports disabled',
      ],
      buttonText: !isPaid ? 'Current Plan' : 'Free Tier',
      buttonDisabled: !isPaid,
      highlighted: false,
    },
    {
      key: 'pro',
      name: proPlan.name,
      badge: 'Most Popular',
      priceDisplay: `₹${proPlan.amountInr.toLocaleString('en-IN')}`,
      periodDisplay: billingInterval === 'annual' ? '/year' : '/month',
      savingsPill: billingInterval === 'annual' ? 'Save 33%' : null,
      description: 'Designed for power users, accountants, and freelancers requiring professional document exports.',
      features: [
        'Everything in Free, plus:',
        '100% Ad-free experience',
        'Unrestricted PDF & XLSX report exports',
        `${proPlan.limits.advanced_export.toLocaleString('en-IN')} advanced exports / period`,
        'Saved cloud workspaces & seller profiles',
        `${proPlan.limits.bulk_job.toLocaleString('en-IN')} bulk spreadsheet batch jobs`,
        'High-resolution PDF generation',
      ],
      limitations: [],
      buttonText: currentPlanCode?.startsWith('pro') ? 'Active Plan' : 'Subscribe to Pro',
      buttonDisabled: currentPlanCode?.startsWith('pro'),
      highlighted: true,
    },
    {
      key: 'business',
      name: businessPlan.name,
      badge: 'Teams & Firms',
      priceDisplay: `₹${businessPlan.amountInr.toLocaleString('en-IN')}`,
      periodDisplay: billingInterval === 'annual' ? '/year' : '/month',
      savingsPill: billingInterval === 'annual' ? 'Save 16%' : null,
      description: 'Built for finance teams, CA firms, and high-volume corporate spreadsheet pipelines.',
      features: [
        'Everything in Pro, plus:',
        `${businessPlan.limits.advanced_export.toLocaleString('en-IN')} advanced exports / period`,
        `${businessPlan.limits.bulk_job.toLocaleString('en-IN')} bulk batch jobs / period`,
        `${businessPlan.limits.business_workflow.toLocaleString('en-IN')} business automation workflows`,
        'GSTR-2B vs Purchase register bulk pipelines',
        'Priority email & developer support',
        'Enterprise data SLA & roadmap voting',
      ],
      limitations: [],
      buttonText: currentPlanCode?.startsWith('business') ? 'Active Plan' : 'Subscribe to Business',
      buttonDisabled: currentPlanCode?.startsWith('business'),
      highlighted: false,
    },
  ];

  return (
    <div className="orbit-light min-h-screen bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors flex">
      <QuickAccessLeftSidebar />
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <ToolsHomeHeader />

          {/* Hero Section */}
          <section className="py-12 sm:py-16 text-center max-w-4xl mx-auto px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/60 px-3.5 py-1 text-xs font-semibold text-violet-800 dark:text-violet-300 shadow-2xs mb-4">
              <Sparkles size={14} className="text-violet-600 dark:text-violet-400" />
              <span>Transparent Pricing • Cancel Anytime</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              Pick the Right Plan for Your Workflow
            </h1>

            <p className="mt-4 text-base sm:text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed">
              Every tool and calculator is 100% free and runs in your browser. Upgrade to unlock saved workspaces, batch processing, and professional exports.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="mt-8 inline-flex items-center p-1 rounded-2xl bg-stone-200/70 dark:bg-stone-800/80 border border-[var(--orbit-border)]">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition ${
                  billingInterval === 'monthly'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('annual')}
                className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  billingInterval === 'annual'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  Save up to 33%
                </span>
              </button>
            </div>

            {/* Status notification */}
            {statusMessage && (
              <div
                className={`mt-6 max-w-lg mx-auto p-3.5 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : statusMessage.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    : 'bg-violet-50 dark:bg-violet-950/60 border-violet-300 dark:border-violet-800 text-violet-800 dark:text-violet-200'
                }`}
              >
                {statusMessage.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                {statusMessage.type === 'error' && <AlertCircle size={16} className="text-rose-600 shrink-0" />}
                {statusMessage.type === 'info' && <Sparkles size={16} className="text-violet-600 shrink-0" />}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </section>

          {/* Pricing Cards Grid */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              {tiers.map((tier) => (
                <div
                  key={tier.key}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                    tier.highlighted
                      ? 'border-2 border-violet-600 dark:border-violet-500 bg-white dark:bg-stone-900 shadow-xl relative scale-100 sm:scale-105 z-10'
                      : 'border border-[var(--orbit-border)] bg-stone-50/70 dark:bg-stone-900/60 shadow-xs'
                  }`}
                >
                  <div>
                    {tier.badge && (
                      <div className="inline-block px-3 py-1 rounded-full bg-violet-600 text-white text-[11px] font-bold uppercase tracking-wider mb-4">
                        {tier.badge}
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">{tier.name}</h3>
                    <p className="mt-2 text-xs text-stone-600 dark:text-stone-300 leading-relaxed min-h-[36px]">
                      {tier.description}
                    </p>

                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100">
                        {tier.priceDisplay}
                      </span>
                      <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                        {tier.periodDisplay}
                      </span>
                      {tier.savingsPill && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                          {tier.savingsPill}
                        </span>
                      )}
                    </div>

                    <div className="mt-8 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">Included Features</p>
                      <ul className="space-y-2.5 text-xs text-stone-700 dark:text-stone-200">
                        {tier.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {tier.limitations.length > 0 && (
                        <div className="pt-4 border-t border-[var(--orbit-border)] space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">Not Included</p>
                          <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                            {tier.limitations.map((lim) => (
                              <li key={lim} className="flex items-start gap-2">
                                <span className="text-stone-400 dark:text-stone-500">•</span>
                                <span>{lim}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-[var(--orbit-border)]">
                    <button
                      type="button"
                      disabled={tier.buttonDisabled || loadingPlan === `${tier.key}_${billingInterval}`}
                      onClick={() => handleSubscribe(tier.key)}
                      className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs ${
                        tier.highlighted
                          ? 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50'
                          : 'border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-50'
                      }`}
                    >
                      {loadingPlan === `${tier.key}_${billingInterval}` ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Initiating Checkout…</span>
                        </>
                      ) : (
                        <span>{tier.buttonText}</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Privacy & Guarantee Banner */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
            <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <ShieldCheck size={30} />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                  Client-Side Calculation Promise
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  Calculators and interactive spreadsheet engines process your numbers entirely inside your browser memory. We never gate basic calculations or hold your working data hostage.
                </p>
              </div>
            </div>
          </section>

          {/* Frequently Asked Questions */}
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 space-y-6">
            <h2 className="text-2xl font-bold text-center text-stone-900 dark:text-stone-100 mb-8">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-violet-600" />
                  What payment methods are supported?
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  We partner with Razorpay to process payments securely. You can subscribe using UPI (Google Pay, PhonePe, Paytm), debit/credit cards (Visa, Mastercard, RuPay), and all major Indian net banking accounts.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-violet-600" />
                  Can I cancel my subscription anytime?
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Yes, absolutely. You can cancel with one click from your account settings. You will retain full access to all paid features until the end of your current paid billing period.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-violet-600" />
                  Do free calculations require an account?
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  No account is ever required for on-screen calculations. You can use every tool anonymously without providing an email address or credit card.
                </p>
              </div>
            </div>
          </section>
        </div>

        <ToolsHomeFooter />
      </div>
    </div>
  );
}
