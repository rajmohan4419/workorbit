import React from 'react';

const OFFERS = {
  finance: {
    badge: 'Tax & Investment',
    headline: 'Optimize your AY 2026–27 Tax Return',
    subtext: 'File in 3 minutes or get an expert CA consultation.',
    cta: 'File on ClearTax →',
    link: 'https://cleartax.in/?ref=orbitboard', // Insert affiliate link
  },
  career: {
    badge: 'Career Growth',
    headline: 'Benchmarking your compensation?',
    subtext: 'Get an ATS-optimized resume and live compensation data.',
    cta: 'Review Resume →',
    link: 'https://topmate.io/?ref=orbitboard', // Insert affiliate link
  },
  default: {
    badge: '100% Free & Local',
    headline: 'Processed locally in your browser',
    subtext: 'No servers, zero data storage. Keep OrbitBoard running fast.',
    cta: 'Buy me a Coffee (₹49) ☕',
    link: 'https://rzp.io/l/orbitboard-tip', // Razorpay link or UPI modal
  }
};

export default function ContextualCard({ category }) {
  const offer = OFFERS[category] || OFFERS.default;

  return (
    <div className="my-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-left space-y-1">
        <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {offer.badge}
        </span>
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {offer.headline}
        </h4>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {offer.subtext}
        </p>
      </div>
      <a
        href={offer.link}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        {offer.cta}
      </a>
    </div>
  );
}
