import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import SearchModal from '../tasks/SearchModal';
import { useWorkspaceStore } from '../../store/workspaceStore';

export default function AppShell() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Global Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }

      // Quick Nav / Actions (if not typing in an input)
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      if (e.key === 'w') {
        navigate('/workspaces');
      }
      if (e.key === 'm') {
        navigate('/my-tasks');
      }
      if (e.key === 'i' && activeWorkspace) {
        navigate(`/workspaces/${activeWorkspace.slug}/settings/members`);
      }
      if (e.key === 't') {
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, activeWorkspace]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
