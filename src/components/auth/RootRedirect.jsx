import { Suspense, lazy } from 'react';
import { useAuthStore } from '../../store/authStore';
import AppShell from '../layout/AppShell';
import ProtectedRoute from '../auth/ProtectedRoute';

const HomePage = lazy(() => import('../../pages/marketing/HomePage'));

const isAppSubdomain = !['orbitboard.in', 'www.orbitboard.in'].includes(window.location.hostname);

export const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  if (loading) return <LoadingSpinner />;

  if (user || isAppSubdomain) {
    return (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomePage />
    </Suspense>
  );
}
