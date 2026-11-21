import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAccountSession } from '../../lib/monetization/useAccountSession';
import { usePlan } from '../../lib/monetization/usePlan';
import { trackPaywallViewed } from '../../lib/analytics';

const FEATURE_METADATA = {
  advanced_exports: {
    title: 'Sign up for PDF & Excel downloads',
    description: 'Create an account to download PDF/XLSX files and track your usage. On-screen tools remain free without an account.',
  },
  saved_workspaces: {
    title: 'Saved Cloud Workspaces',
    description: 'Save and manage your seller profiles, recurring invoices, and custom schemas securely across your devices.',
  },
  bulk_processing: {
    title: 'Batch & Bulk Processing',
    description: 'Process hundreds of spreadsheets, bulk GST returns, and multi-file accounting reconciliations in a single run.',
  },
  business_workflows: {
    title: 'Business Automation Workflows',
    description: 'Unlock enterprise-tier reconciliation pipelines, priority data export queues, and automated audit trails.',
  },
};

export function PlanGate({
  feature,
  children,
  fallback = null,
  title,
  description,
}) {
  const { session } = useAccountSession();
  const signedIn = session && !session.user?.is_anonymous;
  const { hasFeature, loading } = usePlan();
  const isEntitled = hasFeature(feature);

  useEffect(() => {
    if (!loading && !isEntitled && feature) {
      trackPaywallViewed(feature);
    }
  }, [feature, isEntitled, loading]);

  if (loading) {
    return (
      <div role="status" aria-label="Checking account access" className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 p-6 min-h-[160px] flex items-center justify-center animate-pulse">
        <div className="h-6 w-32 rounded-lg bg-stone-200 dark:bg-stone-800" />
      </div>
    );
  }

  if (isEntitled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const meta = FEATURE_METADATA[feature] || {
    title: 'Pro Feature Upgrade',
    description: 'Upgrade your OrbitBoard plan to access this capability.',
  };

  const displayTitle = signedIn ? 'Manage your download account' : title || meta.title;
  const displayDescription = signedIn ? 'View your usage, PDF credit balance and top-up options in your account.' : description || meta.description;

  return (
    <div
      role="region"
      aria-label="Account required"
      className="anim-fade-up rounded-2xl border border-accent-200 dark:border-accent-800/60 bg-gradient-to-b from-accent-50/50 via-white to-stone-50 dark:from-accent-950/20 dark:via-stone-900 dark:to-stone-900 p-6 sm:p-8 text-center max-w-lg mx-auto shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-sm mb-4">
        <Lock size={22} />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-100 dark:bg-accent-900/60 text-accent-800 dark:text-accent-300 text-xs font-semibold mb-3">
        <Sparkles size={13} className="text-accent-600 dark:text-accent-400" />
        <span>Your OrbitBoard account</span>
      </div>

      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">
        {displayTitle}
      </h3>

      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mb-5 leading-relaxed">
        {displayDescription}
      </p>

      <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700/80 text-[11px] text-stone-600 dark:text-stone-400 flex items-center justify-center gap-2 mb-6">
        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Free on-screen use · No sign-up required</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/account"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs sm:text-sm font-semibold transition inline-flex items-center justify-center gap-2 shadow-xs"
        >
          <span>{signedIn ? 'View account & usage' : 'Sign up / Sign in'}</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default PlanGate;
