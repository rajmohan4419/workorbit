import { useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2, LogOut } from 'lucide-react'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useAuthStore } from '../store/authStore'

export default function WorkspaceSelectPage() {
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const fetchWorkspaces = useWorkspaceStore(useCallback((state) => state.fetchWorkspaces, []))
  const loading = useWorkspaceStore((state) => state.loading)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">O</span>
            </div>
            <span className="font-bold text-gray-900 text-xl tracking-tight">WorkOrbit</span>
          </div>
          <button
            onClick={() => signOut()}
            className="text-gray-400 hover:text-red-500 transition-colors p-2"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-500 text-sm mb-8">Select a workspace to continue.</p>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="space-y-3">
                {workspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    to={`/workspaces/${ws.slug}`}
                    className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-indigo-200 hover:bg-white transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 text-indigo-600 font-bold shadow-sm">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{ws.name}</div>
                        <div className="text-xs text-gray-400">/{ws.slug}</div>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Signed in as <span className="font-medium text-gray-700">{user?.email}</span></span>
          </div>
        </div>
      </div>
    </div>
  )
}
