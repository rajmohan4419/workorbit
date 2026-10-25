import { RazorpayPaymentButton } from './RazorpayPaymentButton';

const OFFERS = {
  finance: {
    badge: 'Buy me a Coffee ☕',
    headline: 'Found this financial tool helpful? Buy me a coffee',
    subtext: '100% free, private and processed locally in your browser. Keep OrbitBoard running fast.',
    isPaymentButton: true,
  },
  career: {
    badge: 'Buy me a Coffee ☕',
    headline: 'Found this career tool helpful? Buy me a coffee',
    subtext: '100% free, private and processed locally in your browser. Keep OrbitBoard running fast.',
    isPaymentButton: true,
  },
  developer: {
    badge: 'Buy me a Coffee ☕',
    headline: 'Found this developer tool useful? Buy me a coffee',
    subtext: '100% free, zero data storage, and client-side. Keep OrbitBoard running fast.',
    isPaymentButton: true,
  },
  default: {
    badge: 'Buy me a Coffee ☕',
    headline: 'Enjoying this tool? Buy me a coffee',
    subtext: '100% free, private and processed locally in your browser. Keep OrbitBoard running fast.',
    isPaymentButton: true,
  }
};

export default function ContextualCard({ category }) {
  const key = typeof category === 'string' ? category.toLowerCase().trim() : '';
  const offer = OFFERS[key] || OFFERS.default;

  return (
    <div className="my-6 rounded-2xl border border-[var(--orbit-border)] bg-[var(--orbit-surface-soft)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-left space-y-1.5">
        <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
          {offer.badge}
        </span>
        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          {offer.headline}
        </h4>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-5">
          {offer.subtext}
        </p>
      </div>
      <div className="shrink-0 flex items-center justify-center">
        <RazorpayPaymentButton buttonId="pl_Ts1A8URfk03elY" />
      </div>
    </div>
  );
}
