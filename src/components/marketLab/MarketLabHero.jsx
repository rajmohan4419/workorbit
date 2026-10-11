import { FlaskConical } from 'lucide-react';

export function MarketLabHero() {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-violet-200 bg-white p-6 sm:p-10 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
          <FlaskConical size={14} /> Market Lab
        </span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Prototype · demo dataset
        </span>
      </div>
      <h1 className="mt-5 max-w-4xl text-4xl sm:text-6xl font-black tracking-tight text-stone-900">
        Test the idea. Don't just ask the AI.
      </h1>
      <p className="mt-4 max-w-3xl text-base sm:text-lg leading-7 text-stone-600">
        OrbitBoard Market Lab is designed around a simple workflow: form a market hypothesis, test it against historical data, inspect the evidence, then replay the market context.
      </p>
    </section>
  );
}
