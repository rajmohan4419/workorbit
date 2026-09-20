import { useRef, useState } from 'react';

const AD_SRC = 'https://pl31429339.profitableratecpmnetwork.com/e2/f5/6e/e2f56e3c24d12b238ac91b475138d9ca.js';

export default function SampleAd() {
  const hostRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const loadAd = () => {
    if (loaded || !hostRef.current) return;
    const script = document.createElement('script');
    script.src = AD_SRC;
    script.async = true;
    script.dataset.orbitboardSampleAd = 'true';
    hostRef.current.appendChild(script);
    setLoaded(true);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4" aria-label="Sample advertisement">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Advertisement · sample</p>
        <button type="button" onClick={loadAd} disabled={loaded} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-violet-500 disabled:opacity-50">
          {loaded ? 'Loaded' : 'Load sample ad'}
        </button>
      </div>
      <div ref={hostRef} className="mt-3 min-h-12" />
    </section>
  );
}
