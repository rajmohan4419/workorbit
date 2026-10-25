// Remove: import React from 'react';

const OFFERS = {
  finance: {
    badge: 'Tax & Investment',
    headline: 'Optimize your AY 2026–27 Tax Return',
    subtext: 'File in 3 minutes or get an expert CA consultation.',
    cta: 'File on ClearTax →',
    link: 'https://cleartax.in/?ref=orbitboard',
  },
  career: {
    badge: 'Career Growth',
    headline: 'Benchmarking your compensation?',
    subtext: 'Get an ATS-optimized resume and live compensation data.',
    cta: 'Review Resume →',
    link: 'https://topmate.io/?ref=orbitboard',
  },
  developer: {
    badge: 'Developer Resources',
    headline: 'Build & Ship Web Apps Faster',
    subtext: 'Free database, auth, and storage with instant deployment.',
    cta: 'Explore Supabase →',
    link: 'https://supabase.com',
  },
  default: {
    badge: '100% Free & Local',
    headline: 'Processed locally in your browser',
    subtext: 'No servers, zero data storage. Keep OrbitBoard running fast.',
    cta: 'Buy me a Coffee (₹49) ☕',
    link: 'https://rzp.io/l/orbitboard-tip',
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
      <a
        href={offer.link}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors inline-flex items-center justify-center"
      >
        {offer.cta}
      </a>
    </div>
  );
}
