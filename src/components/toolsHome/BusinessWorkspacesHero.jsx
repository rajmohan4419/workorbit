import { Link } from 'react-router-dom';
import {
  Sparkles, ArrowRight, Building2, FileText, FileSpreadsheet,
  Clock, TrendingUp, Target, ShieldCheck
} from 'lucide-react';
import { LISTED_TOOLS } from '../../data/toolCatalog';

const FEATURED_WORKFLOW_CONFIG = [
  {
    slug: 'bank-reconciliation',
    badge: 'Flagship Workflow',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    icon: Building2,
    iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    metrics: 'Dual-file matcher • 100% private',
  },
  {
    slug: 'gst-invoice-generator',
    badge: 'Tax Compliant',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    icon: FileText,
    iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50',
    metrics: 'Auto Intra/Inter-state • PDF Download',
  },
  {
    slug: 'excel-engine',
    badge: 'Excel Engine',
    badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    icon: FileSpreadsheet,
    iconColor: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50',
    metrics: 'XLSX / CSV • In-browser engine',
  },
  {
    slug: 'invoice-aging-report',
    badge: 'Collections',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    icon: Clock,
    iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    metrics: 'Aging buckets • Concentration risk',
  },
  {
    slug: 'saas-retention-calculator',
    badge: 'SaaS Metrics',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    icon: TrendingUp,
    iconColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50',
    metrics: 'NRR / GRR • Benchmarks included',
  },
  {
    slug: 'sales-pipeline-forecaster',
    badge: 'Revenue Ops',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    icon: Target,
    iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50',
    metrics: 'Weighted forecast • Target gap',
  },
];

// Derive workflows dynamically from central catalog to guarantee links, names & descriptions never drift
const BUSINESS_WORKFLOWS = FEATURED_WORKFLOW_CONFIG.map(cfg => {
  const tool = LISTED_TOOLS.find(t => t.slug === cfg.slug);
  return {
    ...cfg,
    title: tool?.name || cfg.slug,
    task: tool?.description || '',
    href: `/tools/${cfg.slug}`,
  };
});

export function BusinessWorkspacesHero() {
  return (
    <section className="mx-auto max-w-6xl py-6 sm:py-8 border-t border-[var(--orbit-border)]">
      {/* Header with high-value positioning */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-800 dark:bg-accent-950/70 dark:text-accent-300 mb-2">
            <Sparkles size={12} className="text-amber-500" />
            Task-Based Business Discovery
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            Business & Financial Workspaces
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1 max-w-2xl">
            Purpose-built workflows for founders, finance teams, and operators. Perform reconciliations, create tax invoices, clean spreadsheets, and track SaaS revenue—privately in your browser.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Zero server upload • 100% private</span>
        </div>
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {BUSINESS_WORKFLOWS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.slug}
              to={item.href}
              className="group relative flex flex-col justify-between rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 shadow-xs hover:border-accent-400 hover:shadow-md transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconColor} transition-transform group-hover:scale-105`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-3">
                  {item.task}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--orbit-border)] flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
                  {item.metrics}
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-accent-600 dark:text-accent-400 group-hover:translate-x-0.5 transition-transform">
                  Launch
                  <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default BusinessWorkspacesHero;
