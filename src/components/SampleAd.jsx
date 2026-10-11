import { useEffect, useRef } from 'react';

export default function SampleAd() {
  const adRef = useRef(false);

  useEffect(() => {
    if (adRef.current) return;
    adRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('[OrbitBoard AdSense] push error', e);
    }
  }, []);

  return (
    <section className="rounded-2xl border border-[#e7dfd3] bg-white p-4 shadow-sm" aria-label="Advertisement space">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-stone-500">Advertisement</p>
      </div>
      <div className="min-h-[90px] flex items-center justify-center overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', textAlign: 'center' }}
          data-ad-client="ca-pub-9160921653901381"
          data-ad-slot="auto"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </section>
  );
}
