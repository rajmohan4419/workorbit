import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useProjectStore } from './store/projectStore'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import Sidebar from './components/layout/Sidebar'

function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/project/:id" element={<ProjectPage />} />
          <Route path="/my-tasks" element={
            <div className="p-6">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">My tasks</h1>
              <p className="text-gray-400 text-sm">Coming soon — tasks assigned to you across all projects.</p>
            </div>
          } />
          <Route path="/settings" element={
            <div className="p-6">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Settings</h1>
              <p className="text-gray-400 text-sm">Workspace settings coming soon.</p>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading, init } = useAuthStore()
  const { fetchProjects } = useProjectStore()

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (user) fetchProjects()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      {user ? <AppShell /> : <AuthPage />}
    </BrowserRouter>
  )
}
