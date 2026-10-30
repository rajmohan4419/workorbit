import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ToolsHome from './pages/ToolsHome';
import ToolsCatalogue from './pages/ToolsCatalogue';
import ToolPageRoute from './pages/ToolPageRoute';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

export default function App() {
  return (
    <BrowserRouter>
        <AdSense />
        <Analytics />
        <Telemetry />
        <Routes>
          <Route path="/" element={<ToolsHome />} />
          <Route path="/tools" element={<ToolsCatalogue />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          {/* Market Lab is temporarily hidden; keep its implementation for a future re-enable. */}
          <Route path="/market-lab" element={<Navigate to="/" replace />} />
          <Route path="/market-lab/:symbol" element={<Navigate to="/" replace />} />
          <Route path="/market/:symbol" element={<Navigate to="/" replace />} />
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
    else window.addEventListener('load', scheduleAfterLoad);

    return () => {
      cancelled = true;
      window.removeEventListener('load', scheduleAfterLoad);
      window.clearTimeout(timer);
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
