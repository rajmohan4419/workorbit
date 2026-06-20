import { useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useProjectStore } from './store/projectStore'
import { useTaskStore } from './store/taskStore'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import MyTasksPage from './pages/MyTasksPage'
import UsersPage from './pages/UsersPage'
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

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    loader: async () => {
      await useProjectStore.getState().fetchProjects()
      return null
    },
    children: [
      {
        index: true,
        element: <DashboardPage />,
        loader: async () => {
          await useTaskStore.getState().fetchGlobalTasks()
          return null
        }
      },
      {
        path: 'project/:id',
        element: <ProjectPage />,
        loader: async ({ params }) => {
          await useTaskStore.getState().fetchTasks(params.id)
          return null
        }
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
        path: 'users',
        element: <AdminRoute><UsersPage /></AdminRoute>,
        loader: async () => {
          await useAuthStore.getState().fetchAllProfiles()
          return null
        }
      },
      {
        path: 'settings',
        element: (
          <div className="p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-400 text-sm">Workspace settings coming soon.</p>
          </div>
        )
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  },
  {
    path: '/auth',
    element: <AuthPage />
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

function AdminRoute({ children }) {
  const profile = useAuthStore((state) => state.profile)
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
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
