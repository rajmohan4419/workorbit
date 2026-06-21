import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Layout, ArrowRight, Loader2, LogOut } from 'lucide-react'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useAuthStore } from '../store/authStore'

export default function WorkspaceSelectPage() {
  const navigate = useNavigate()
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces)
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace)
  const loading = useWorkspaceStore((state) => state.loading)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)

  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 6)
    const { data, error } = await createWorkspace({ name: name.trim(), slug })
    setCreating(false)
    if (data) {
      navigate(`/w/${data.slug}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">O</span>
            </div>
            <span className="font-bold text-gray-900 text-xl tracking-tight">OrbitBoard</span>
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
            <p className="text-gray-500 text-sm mb-8">Select a workspace to continue or create a new one.</p>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="space-y-3">
                {workspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    to={`/w/${ws.slug}`}
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

                {!isCreating ? (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-all font-medium text-sm"
                  >
                    <Plus size={18} />
                    Create new workspace
                  </button>
                ) : (
                  <form onSubmit={handleCreate} className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30">
                    <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Workspace Name</label>
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={creating || !name.trim()}
                        type="submit"
                        className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {creating ? 'Creating...' : 'Create Workspace'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
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
