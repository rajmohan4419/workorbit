import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import ToolsHome from './pages/ToolsHome';
import ToolsCatalogue from './pages/ToolsCatalogue';

const ToolPage = lazy(() => import('./pages/ToolPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Analytics />
      <Telemetry />
      <Routes>
        <Route path="/" element={<ToolsHome />} />
        <Route path="/tools" element={<ToolsCatalogue />} />
        <Route
          path="/tools/:slug"
          element={
            <Suspense fallback={<ToolPageLoading />}>
              <ToolPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ToolPageLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-sm text-slate-400">Loading tool…</div>
    </div>
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

    const schedule = () => {
      timer = window.setTimeout(load, 2000);
    };

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
          window.dispatchEvent(
            new CustomEvent('orbitboard:visitor-count', { detail: total })
          );
        }
      } catch (error) {
        console.warn('[OrbitBoard telemetry] deferred telemetry failed', error);
      }
    };

    const scheduleAfterLoad = () => {
      timer = window.setTimeout(runTelemetry, 1500);
    };

    if (document.readyState === 'complete') {
      scheduleAfterLoad();
    } else {
      window.addEventListener('load', scheduleAfterLoad, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', scheduleAfterLoad);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [location.pathname]);

  return null;
}
