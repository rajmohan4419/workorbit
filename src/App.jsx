import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ToolsHome from './pages/ToolsHome';
import ToolPage from './pages/ToolPage';
import { recordVisit, logEvent } from './lib/telemetry';

export default function App() {
  return (
    <BrowserRouter>
      <Telemetry />
      <Routes>
        <Route path="/" element={<ToolsHome />} />
        <Route path="/tools" element={<ToolsHome />} />
        <Route path="/tools/:slug" element={<ToolPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Telemetry() {
  const location = useLocation();

  useEffect(() => {
    recordVisit(location.pathname).then(total => {
      window.dispatchEvent(new CustomEvent('orbitboard:visitor-count', { detail: total }));
    });
    logEvent('page.viewed', { path: location.pathname });
  }, [location.pathname]);

  return null;
}
