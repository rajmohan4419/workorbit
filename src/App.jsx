import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import AppRouter from './routes/AppRouter';
import ErrorBoundary from './components/layout/ErrorBoundary';

const isAppSubdomain = !['orbitboard.in', 'www.orbitboard.in'].includes(window.location.hostname);

export default function App() {
  const init = useAuthStore((state) => state.init);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    const unsubscribe = init();
    return () => unsubscribe?.();
  }, [init]);

  if (loading && isAppSubdomain) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}
