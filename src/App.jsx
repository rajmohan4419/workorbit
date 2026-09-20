import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ToolsHome from './pages/ToolsHome';
import ToolsCatalogue from './pages/ToolsCatalogue';
import ToolPageRoute from './pages/ToolPageRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Telemetry />
      <Routes>
        <Route path="/" element={<ToolsHome />} />
        <Route path="/tools" element={<ToolsCatalogue />} />
        <Route path="/tools/:slug" element={<ToolPageRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
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
