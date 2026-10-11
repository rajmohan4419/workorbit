import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ToolsHome from './pages/ToolsHome';
import ToolsCatalogue from './pages/ToolsCatalogue';
import ToolPageRoute from './pages/ToolPageRoute';
import MarketLab from './pages/MarketLab';
import MarketSecurity from './pages/MarketSecurity';
import ExperimentBuilder from './pages/ExperimentBuilder';

export default function App() {
  return (
    <BrowserRouter>
      <AdSense />
      <Analytics />
      <Telemetry />
      <Routes>
        <Route path="/" element={<ToolsHome />} />
        <Route path="/tools" element={<ToolsCatalogue />} />
        <Route path="/market-lab" element={<MarketLab />} />
        <Route path="/market/:symbol" element={<MarketSecurity />} />
        <Route path="/market/:symbol/experiment" element={<ExperimentBuilder />} />
        <Route path="/tools/:slug" element={<ToolPageRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Analytics() {
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const load = async () => {
      if (cancelled) return;
      try {
        const { loadGoogleAnalytics } = await import('./lib/analytics');
        if (!cancelled) await loadGoogleAnalytics();
      } catch (error) {
        console.warn('[OrbitBoard analytics] deferred load failed', error);
      }
    };

    const schedule = () => { timer = window.setTimeout(load, 8000); };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', schedule);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  return null;
}

function Telemetry() {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const runTelemetry = async () => {
      if (cancelled) return;
      try {
        const { recordVisit } = await import('./lib/telemetry');
        if (cancelled) return;
        const total = await recordVisit(location.pathname);
        if (!cancelled && typeof total === 'number' && Number.isFinite(total)) {
          window.dispatchEvent(new CustomEvent('orbitboard:visitor-count', { detail: total }));
        }
      } catch (error) {
        console.warn('[OrbitBoard telemetry] deferred telemetry failed', error);
      }
    };

    const scheduleAfterLoad = () => { timer = window.setTimeout(runTelemetry, 8000); };

    if (document.readyState === 'complete') scheduleAfterLoad();
    else window.addEventListener('load', scheduleAfterLoad, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', scheduleAfterLoad);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [location.pathname]);

  return null;
}


function AdSense() {
  useEffect(() => {
    const existing = document.querySelector('script[data-orbitboard-adsense]');
    if (existing) return;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.orbitboardAdsense = 'true';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9160921653901381';
    document.head.appendChild(script);
  }, []);
  return null;
}
