import { Suspense, lazy, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import AppShell from '../layout/AppShell';
import ProtectedRoute from '../auth/ProtectedRoute';
import { isAppSubdomain, isMarketingDomain, redirectToApp } from '../../lib/utils/domain';

const HomePage = lazy(() => import('../../pages/marketing/HomePage'));

export const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    // If we're on the marketing domain but authenticated, redirect to the app domain
    if (isMarketingDomain && user && !loading) {
      redirectToApp('/');
    }
  }, [user, loading]);

  if (loading) return <LoadingSpinner />;

  // If we're on the app subdomain (or authenticated), show the app shell
  if (isAppSubdomain || user) {
    return (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    );
  }

  // Otherwise, if we're on the marketing domain, show the homepage
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomePage />
    </Suspense>
  );
}
