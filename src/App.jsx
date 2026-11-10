import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TOOLS } from './data/toolCatalog';
import { AmbientBackground } from './components/layout/AmbientBackground';
import { InstallPrompt } from './components/InstallPrompt';
import { DiwaliCelebration } from './components/DiwaliCelebration';
import { QuickQuiz } from './components/QuickQuiz';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { GlobalPreviewModal } from './components/tools/PreviewModal';
import ToolsHome from './pages/ToolsHome';
import { loadGoogleAnalytics } from './lib/analytics';
const WishesStudio = lazy(() => import('./pages/WishesStudio'));
const ToolsCatalogue = lazy(() => import('./pages/ToolsCatalogue'));
const ToolPageRoute = lazy(() => import('./pages/ToolPageRoute'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const Pricing = lazy(() => import('./pages/Pricing'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <BrowserRouter>
      <AppBackgroundShell />
      <Analytics />
      <Telemetry />
      <InstallPrompt />
      <DiwaliCelebration />
      <QuickQuiz />
      <CookieConsentBanner />
      <GlobalPreviewModal />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Suspense fallback={<div className="min-h-screen bg-[var(--orbit-canvas)]" />}>
          <Routes>
            <Route path="/" element={<ToolsHome />} />
            <Route path="/tools" element={<ToolsCatalogue />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/tools/wishes-studio" element={<WishesStudio />} />
            <Route path="/tools/:slug" element={<ToolPageRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

function AppBackgroundShell() {
  const location = useLocation();
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const handleCategoryPreview = (e) => {
      setPreview({ theme: e.detail || null, path: location.pathname });
    };
    window.addEventListener('orbitboard:category-theme', handleCategoryPreview);
    return () => window.removeEventListener('orbitboard:category-theme', handleCategoryPreview);
  }, [location.pathname]);

  const activeInteractiveTheme = preview && preview.path === location.pathname ? preview.theme : null;

  const { theme, mode } = useMemo(() => {
    if (activeInteractiveTheme) {
      return { theme: activeInteractiveTheme, mode: 'landing' };
    }

    const path = location.pathname;
    if (path.startsWith('/tools/')) {
      const slug = path.replace('/tools/', '').split('/')[0];
      const tool = TOOLS.find(t => t.slug === slug);
      if (tool) {
        if (tool.slug.includes('pdf') || tool.slug === 'txt-to-pdf') {
          return { theme: 'pdf', mode: 'workspace' };
        }
        if (tool.slug.includes('xlsx') || tool.slug.includes('excel') || tool.slug.includes('csv')) {
          return { theme: 'spreadsheet', mode: 'workspace' };
        }
        const cat = (tool.category || '').toLowerCase();
        return { theme: cat || 'orbit', mode: 'workspace' };
      }
      return { theme: 'orbit', mode: 'workspace' };
    }

    if (path === '/pricing' || path.startsWith('/business')) {
      return { theme: 'business', mode: 'landing' };
    }

    if (path === '/tools') {
      const params = new URLSearchParams(location.search);
      const catParam = params.get('category');
      if (catParam) {
        return { theme: catParam.toLowerCase(), mode: 'landing' };
      }
      return { theme: 'orbit', mode: 'landing' };
    }

    return { theme: 'orbit', mode: 'landing' };
  }, [activeInteractiveTheme, location.pathname, location.search]);

  useEffect(() => {
    document.documentElement.setAttribute('data-category-theme', theme);
  }, [theme]);

  return <AmbientBackground mode={mode} theme={theme} />;
}

function Analytics() {
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const load = async () => {
      if (cancelled) return;
      try {
        await loadGoogleAnalytics();
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

