import { useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, redirect } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useProjectStore } from './store/projectStore'
import { useTaskStore } from './store/taskStore'
import { useWorkspaceStore } from './store/workspaceStore'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import FeaturesPage from './pages/marketing/FeaturesPage'
import PricingPage from './pages/marketing/PricingPage'
import ContactPage from './pages/marketing/ContactPage'
import UpcomingFeaturesPage from './pages/marketing/UpcomingFeaturesPage'
import ProjectPage from './pages/ProjectPage'
import MyTasksPage from './pages/MyTasksPage'
import WorkspaceSelectPage from './pages/WorkspaceSelectPage'
import SettingsPage from './pages/SettingsPage'
import ForbiddenPage from './pages/ForbiddenPage'
import Sidebar from './components/layout/Sidebar'
import SearchModal from './components/tasks/SearchModal'

function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

const isAppSubdomain = window.location.hostname === 'app.orbitboard.in' || window.location.hostname === 'localhost'

const router = createBrowserRouter([
  {
    path: '/',
    element: isAppSubdomain ? <ProtectedRoute><AppShell /></ProtectedRoute> : <Navigate to="/features" replace />,
    children: [
      {
        index: true,
        element: <WorkspaceSelectPage />,
      },
      {
        path: 'workspaces/:workspaceSlug',
        loader: async ({ params }) => {
          const workspace = await useWorkspaceStore.getState().setActiveWorkspaceBySlug(params.workspaceSlug)
          if (workspace.error) {
            if (workspace.error.status === 403) {
               throw new Response("Forbidden", { status: 403 });
            }
            return redirect('/')
          }
          if (workspace.data) {
            await useProjectStore.getState().fetchProjects(workspace.data.id)
          }
          return null
        },
        errorElement: <ForbiddenPage />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'projects/:id',
            element: <ProjectPage />,
            loader: async ({ params }) => {
              await useTaskStore.getState().fetchTasks(params.id)
              return null
            }
          },
          {
            path: 'settings',
            element: <SettingsPage />
          },
        ]
      },
      {
        path: 'my-tasks',
        element: <MyTasksPage />,
        loader: async () => {
          const user = useAuthStore.getState().user
          if (user?.id) {
            await useTaskStore.getState().fetchAllUserTasks(user.id)
          }
          return null
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
    element: isAppSubdomain ? <AuthPage /> : <Navigate to="https://app.orbitboard.in/auth" replace />
  },
  {
    path: '/features',
    element: <FeaturesPage />
  },
  {
    path: '/pricing',
    element: <PricingPage />
  },
  {
    path: '/contact',
    element: <ContactPage />
  },
  {
    path: '/upcoming-features',
    element: <UpcomingFeaturesPage />
  },
  {
    path: '/forbidden',
    element: <ForbiddenPage />
  }
])

function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  const init = useAuthStore((state) => state.init)
  const loading = useAuthStore((state) => state.loading)

  useEffect(() => {
    const unsubscribe = init()
    return () => unsubscribe?.()
  }, [init])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <RouterProvider router={router} />
}
