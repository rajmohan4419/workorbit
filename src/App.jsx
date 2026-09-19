import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ToolsHome from './pages/ToolsHome';
import ToolPage from './pages/ToolPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ToolsHome />} />
        <Route path="/tools" element={<ToolsHome />} />
        <Route path="/tools/:slug" element={<ToolPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
