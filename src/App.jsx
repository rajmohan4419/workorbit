import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import ToolsHome from './pages/ToolsHome';
import ToolsCatalogue from './pages/ToolsCatalogue';
import ToolPageRoute from './pages/ToolPageRoute';
import MarketLab from './pages/MarketLab';
import MarketSecurity from './pages/MarketSecurity';
import ExperimentBuilder from './pages/ExperimentBuilder';

export default function App() {
  return (
    <BrowserRouter>
      <Instrumentation />
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

function Instrumentation() {
  const location = useLocation();
  const analyticsLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const runInstrumentation = async () => {
      if (cancelled) return;
      try {
        if (!analyticsLoadedRef.current) {
          const [{ loadGoogleAnalytics }, { recordVisit }] = await Promise.all([
            import('./lib/analytics'),
            import('./lib/telemetry')
          ]);
          if (cancelled) return;

          const [, total] = await Promise.all([
            loadGoogleAnalytics(),
            recordVisit(location.pathname)
          ]);

          analyticsLoadedRef.current = true;

          if (!cancelled && typeof total === 'number' && Number.isFinite(total)) {
            window.dispatchEvent(new CustomEvent('orbitboard:visitor-count', { detail: total }));
          }
        } else {
          const { recordVisit } = await import('./lib/telemetry');
          if (cancelled) return;
          const total = await recordVisit(location.pathname);
          if (!cancelled && typeof total === 'number' && Number.isFinite(total)) {
            window.dispatchEvent(new CustomEvent('orbitboard:visitor-count', { detail: total }));
          }
        }
      } catch (error) {
        console.warn('[OrbitBoard instrumentation] deferred initialization failed', error);
      }
    };

    const scheduleAfterLoad = () => { timer = window.setTimeout(runInstrumentation, 8000); };

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
