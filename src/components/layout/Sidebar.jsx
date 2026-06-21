import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Settings, LogOut, Plus, ChevronDown, Menu, X, Users } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useProjectStore } from '../../store/projectStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { canCreateProject } from '../../lib/permissions'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: CheckSquare, label: 'My tasks', to: '/my-tasks' },
  { icon: Settings, label: 'Settings', to: '/settings' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const signOut = useAuthStore((state) => state.signOut)
  const projects = useProjectStore((state) => state.projects)
  const setActiveProject = useProjectStore((state) => state.setActiveProject)
  const createProject = useProjectStore((state) => state.createProject)
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace)
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace)
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [projectError, setProjectError] = useState('')
  const [accountError, setAccountError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !activeWorkspace) return

    setProjectError('')
    const { error } = await createProject({ name: newName.trim(), workspaceId: activeWorkspace.id })

    if (error) {
      setProjectError(error.message)
      return
    }

    setNewName('')
    setCreating(false)
    setMobileOpen(false)
  }

  const handleSignOut = async () => {
    setAccountError('')
    setSigningOut(true)
    const { error } = await signOut()
    setSigningOut(false)

    if (error) setAccountError(error.message)
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U'

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 flex-shrink-0
        transform transition-transform lg:transform-none
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">O</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">OrbitBoard</span>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            <div className="mb-6 px-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Workspace</label>
              <div className="relative group">
                <button
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {activeWorkspace?.name?.charAt(0).toUpperCase() || 'O'}
                    </div>
                    <span className="text-xs font-bold text-gray-700 truncate">{activeWorkspace?.name || 'Select Workspace'}</span>
                  </div>
                  <ChevronDown size={14} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </button>

                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspace(ws)
                          navigate(`/w/${ws.slug}`)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${activeWorkspace?.id === ws.id ? 'text-indigo-600 font-bold bg-indigo-50/30' : 'text-gray-600'}`}
                      >
                        <span className="truncate">{ws.name}</span>
                        {activeWorkspace?.id === ws.id && <div className="w-1 h-1 rounded-full bg-indigo-600" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-50 p-1">
                    <Link
                      to="/"
                      className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Plus size={12} />
                      Switch Workspace
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {navItems.map(({ icon: Icon, label, to }) => {
              const fullTo = activeWorkspace ? `/w/${activeWorkspace.slug}${to === '/' ? '' : to}` : to
              return (
                <Link
                  key={to}
                  to={fullTo}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === fullTo
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}

            {profile?.role === 'admin' && (
              <Link
                to="/users"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === '/users'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Users size={16} />
                User Management
              </Link>
            )}

            <div className="pt-4">
              <button
                onClick={() => setProjectsOpen(!projectsOpen)}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
              >
                <span>Projects</span>
                <ChevronDown size={12} className={`transition-transform ${projectsOpen ? '' : '-rotate-90'}`} />
              </button>

              {projectsOpen && (
                <div className="mt-1 space-y-0.5">
                  {projects.map((project) => {
                    const projectPath = activeWorkspace ? `/w/${activeWorkspace.slug}/project/${project.id}` : `/project/${project.id}`
                    const isActive = location.pathname === projectPath

                    return (
                      <Link
                        key={project.id}
                        to={projectPath}
                        onClick={() => {
                          setActiveProject(project)
                          setMobileOpen(false)
                        }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                        <span className="truncate">{project.name}</span>
                      </Link>
                    )
                  })}

                  {canCreateProject(profile?.role) && (
                    <>
                      {creating ? (
                        <form onSubmit={handleCreateProject} className="px-3 pt-1">
                          <input
                            autoFocus
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Project name"
                            className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setCreating(false)
                                setProjectError('')
                              }
                            }}
                          />
                          <div className="flex gap-2 mt-1.5">
                            <button type="submit" className="text-xs text-indigo-600 font-medium hover:text-indigo-800">Add</button>
                            <button
                              type="button"
                              onClick={() => {
                                setCreating(false)
                                setProjectError('')
                              }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                          {projectError && (
                            <p className="mt-2 text-xs text-red-500">{projectError}</p>
                          )}
                        </form>
                      ) : (
                        <button
                          onClick={() => {
                            setCreating(true)
                            setProjectError('')
                          }}
                          className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-50"
                        >
                          <Plus size={14} />
                          New project
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>

          <div className="px-3 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700 flex-shrink-0">
                {initials}
              </div>
              <span className="text-xs text-gray-600 truncate flex-1">{user?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-3 px-3 py-2 w-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60"
            >
              <LogOut size={15} />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
            {accountError && (
              <p className="mt-2 px-3 text-xs text-red-500">{accountError}</p>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}