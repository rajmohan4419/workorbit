import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import ToolsHome from './pages/ToolsHome';

const ToolPage = lazy(() => import('./pages/ToolPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Telemetry />
      <Routes>
        <Route path="/" element={<ToolsHome />} />
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

function Telemetry() {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const runTelemetry = async () => {
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

    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(runTelemetry, { timeout: 2500 })
      : window.setTimeout(runTelemetry, 1200);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback && typeof schedule === 'number') {
        window.cancelIdleCallback(schedule);
      } else {
        window.clearTimeout(schedule);
      }
    };
  }, [location.pathname]);

  return null;
}
