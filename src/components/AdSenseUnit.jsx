import { useEffect, useRef, useState } from 'react';

export default function AdSenseUnit({
  slot = '',
  format = 'auto',
  responsive = 'true',
  layout = '',
  className = ''
}) {
  const adRef = useRef(null);
  const pushedRef = useRef(false);
  const [adBlocked, setAdBlocked] = useState(false);

  useEffect(() => {
    if (pushedRef.current) return;
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
        pushedRef.current = true;
      }
    } catch (err) {
      console.warn('[AdSenseUnit] Could not push ad unit', err);
      // Schedule state update outside synchronous effect execution to prevent cascading renders
      setTimeout(() => setAdBlocked(true), 0);
    }
  }, []);

  if (adBlocked) return null;

  return (
    <div className={`my-6 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--orbit-border)] bg-stone-50/50 dark:bg-stone-900/30 p-2 min-h-[100px] text-center ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
        Advertisement
      </span>
      <ins
        ref={adRef}
        className="adsbygoogle block w-full min-w-[250px]"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-9160921653901381"
        data-ad-slot={slot || undefined}
        data-ad-format={format}
        data-full-width-responsive={responsive}
        data-ad-layout={layout || undefined}
      />
    </div>
  );
}
