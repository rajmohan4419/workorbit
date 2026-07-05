import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, redirect, useLocation, Outlet } from 'react-router-dom';
import { isAppSubdomain, isMarketingDomain, redirectToApp, redirectToMarketing } from '../lib/utils/domain';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';

// Components
import RootRedirect, { LoadingSpinner } from '../components/auth/RootRedirect';

// Lazy Loaded Pages
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProjectPage = lazy(() => import('../pages/ProjectPage'));
const MyTasksPage = lazy(() => import('../pages/MyTasksPage'));
const WorkspaceSelectPage = lazy(() => import('../pages/WorkspaceSelectPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const ForbiddenPage = lazy(() => import('../pages/ForbiddenPage'));
const AuthPage = lazy(() => import('../pages/AuthPage'));

// Marketing Pages
const FeaturesPage = lazy(() => import('../pages/marketing/FeaturesPage'));
const PricingPage = lazy(() => import('../pages/marketing/PricingPage'));
const ContactPage = lazy(() => import('../pages/marketing/ContactPage'));
const UpcomingFeaturesPage = lazy(() => import('../pages/marketing/UpcomingFeaturesPage'));

const DomainGuard = () => {
  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    const marketingRoutes = ['/features', '/pricing', '/contact', '/upcoming-features'];
    const appRoutes = ['/auth', '/workspaces', '/my-tasks', '/settings'];

    const isMarketingRoute = marketingRoutes.some(route => path.startsWith(route));
    const isAppRoute = appRoutes.some(route => path.startsWith(route));

    if (isAppSubdomain && isMarketingRoute) {
      redirectToMarketing(path);
    } else if (isMarketingDomain && isAppRoute) {
      redirectToApp(path);
    }
  }, [path]);

  return <Outlet />;
};

const router = createBrowserRouter([
  {
    element: <DomainGuard />,
    children: [
      {
        path: '/',
        element: <RootRedirect />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <WorkspaceSelectPage />
              </Suspense>
            ),
          },
          {
            path: 'workspaces/:workspaceSlug',
            loader: async ({ params }) => {
              const workspace = await useWorkspaceStore.getState().setActiveWorkspaceBySlug(params.workspaceSlug);
              if (workspace.error) {
                if (workspace.error.status === 403) {
                  throw new Response("Forbidden", { status: 403 });
                }
                return redirect('/');
              }
              if (workspace.data) {
                await useProjectStore.getState().fetchProjects(workspace.data.id);
              }
              return null;
            },
            errorElement: (
              <Suspense fallback={<LoadingSpinner />}>
                <ForbiddenPage />
              </Suspense>
            ),
            children: [
              {
                index: true,
                element: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <DashboardPage />
                  </Suspense>
                ),
              },
              {
                path: 'projects/:id',
                element: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProjectPage />
                  </Suspense>
                ),
                loader: async ({ params }) => {
                  await useTaskStore.getState().fetchTasks(params.id);
                  return null;
                },
                children: [
                  { path: 'board', element: <ProjectPage /> },
                  { path: 'list', element: <ProjectPage /> },
                  { path: 'calendar', element: <ProjectPage /> },
                  { path: 'timeline', element: <ProjectPage /> },
                  { path: 'activity', element: <ProjectPage /> },
                  { path: 'sprints', element: <ProjectPage /> },
                  { path: 'members', element: <ProjectPage /> },
                ]
              },
              {
                path: 'settings',
                element: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <SettingsPage initialTab="general" />
                  </Suspense>
                ),
              },
            ]
          },
          {
            path: 'settings',
            children: [
              {
                path: 'profile',
                element: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <SettingsPage initialTab="profile" />
                  </Suspense>
                ),
              },
              {
                path: 'workspace',
                element: (
                  <Suspense fallback={<LoadingSpinner />}>
                    <SettingsPage initialTab="general" />
                  </Suspense>
                ),
              },
              {
                path: 'billing',
                element: <div className="p-8">Billing (Coming Soon)</div>,
              },
            ]
          },
          {
            path: 'my-tasks',
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <MyTasksPage />
              </Suspense>
            ),
            loader: async () => {
              const user = useAuthStore.getState().user;
              if (user?.id) {
                await useTaskStore.getState().fetchAllUserTasks(user.id);
              }
              return null;
            }
          },
          {
            path: '*',
            element: <Navigate to="/" replace />
          }
        ]
      },
      {
        path: '/auth',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <AuthPage />
          </Suspense>
        )
      },
      {
        path: '/features',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <FeaturesPage />
          </Suspense>
        )
      },
      {
        path: '/pricing',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PricingPage />
          </Suspense>
        )
      },
      {
        path: '/contact',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <ContactPage />
          </Suspense>
        )
      },
      {
        path: '/upcoming-features',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <UpcomingFeaturesPage />
          </Suspense>
        )
      },
      {
        path: '/forbidden',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <ForbiddenPage />
          </Suspense>
        )
      }
    ]
  }
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
