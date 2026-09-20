import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { loadToolPage } from './lib/toolPageLoader';
import ToolsHome from './pages/ToolsHome';
import ToolsCatalogue from './pages/ToolsCatalogue';

const ToolPage = lazy(loadToolPage);

export default function App() {
  return (
    <BrowserRouter>
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/90">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="h-6 w-36 rounded bg-slate-800 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-slate-900 animate-pulse" />
        </div>
      </header>
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        <section className="border-b border-slate-800/70 pb-6">
          <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-6 items-center">
            <div className="space-y-4">
              <div className="h-7 w-28 rounded-full bg-slate-800 animate-pulse" />
              <div className="h-10 w-3/4 rounded-lg bg-slate-800 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-slate-900 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-slate-900 animate-pulse" />
              </div>
            </div>
            <div className="min-h-44 sm:min-h-52 rounded-3xl border border-slate-800 bg-slate-900 animate-pulse" />
          </div>
        </section>
        <div className="py-6 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
            <div className="space-y-4">
              <div className="h-8 w-32 rounded-lg bg-slate-800 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-slate-950 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-slate-950 animate-pulse" />
              <div className="h-10 w-28 rounded-xl bg-violet-900/40 animate-pulse" />
            </div>
          </section>
          <aside className="hidden lg:block">
            <div className="h-48 rounded-2xl border border-slate-800 bg-slate-900 animate-pulse" />
          </aside>
        </div>
      </main>
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
