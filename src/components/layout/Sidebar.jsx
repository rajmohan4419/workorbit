import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Settings, LogOut, Plus, ChevronDown, Menu, X, User, Shield, Folder, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useProjectStore } from '../../store/projectStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { canCreateProject } from '../../lib/permissions'

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', to: '', wsRelative: true },
  { icon: CheckSquare, label: 'My tasks', to: '/my-tasks' },
]

const settingsItems = [
  { icon: User, label: 'Profile', to: '/settings/profile' },
  { icon: Settings, label: 'Workspace', to: '/settings', wsRelative: true },
  { icon: Shield, label: 'Billing', to: '/settings/billing' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const projects = useProjectStore((state) => state.projects)
  const setActiveProject = useProjectStore((state) => state.setActiveProject)
  const createProject = useProjectStore((state) => state.createProject)
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace)
  const currentUserRole = useWorkspaceStore((state) => state.currentUserRole)
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace)
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [projectError, setProjectError] = useState('')
  const [accountError, setAccountError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('orbitboard_sidebar_collapsed') === 'true')

  const toggleCollapse = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('orbitboard_sidebar_collapsed', String(next))
  }

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
        fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-gray-100 flex-shrink-0
        transform transition-all duration-300
        ${isCollapsed ? 'lg:w-16 w-56' : 'w-56'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className={`flex items-center justify-between px-4 py-5 border-b border-gray-100 ${isCollapsed ? 'lg:justify-center' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">O</span>
              </div>
              <span className={`font-semibold text-gray-900 text-sm ${isCollapsed ? 'lg:hidden' : ''}`}>OrbitBoard</span>
            </div>
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            <div className="mb-2 px-3">
              <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ${isCollapsed ? 'lg:hidden' : ''}`}>Workspace</label>
              <div className="relative group">
                <button
                  className={`w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl hover:border-indigo-200 transition-all group ${isCollapsed ? 'lg:justify-center lg:px-0' : 'justify-between'}`}
                  title={activeWorkspace?.name || 'Select Workspace'}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {activeWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
                    </div>
                    <span className={`text-xs font-bold text-gray-700 truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{activeWorkspace?.name || 'Select Workspace'}</span>
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 group-hover:text-indigo-600 transition-colors ${isCollapsed ? 'lg:hidden' : ''}`} />
                </button>

                <div className={`absolute top-full left-0 ${isCollapsed ? 'lg:w-48' : 'w-full'} mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all`}>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspace(ws)
                          navigate(`/workspaces/${ws.slug}`)
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
                      className={`flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ${isCollapsed ? 'lg:justify-center' : ''}`}
                    >
                      <Plus size={12} />
                      <span className={isCollapsed ? 'lg:hidden' : ''}>Switch Workspace</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {navItems.filter(item => !item.wsRelative || activeWorkspace).map((item) => {
              const Icon = item.icon
              const fullTo = activeWorkspace && item.wsRelative
                ? `/workspaces/${activeWorkspace.slug}${item.to}`
                : item.to

              return (
                <Link
                  key={item.label}
                  to={fullTo}
                  onClick={() => setMobileOpen(false)}
                  title={item.label}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isCollapsed ? 'lg:justify-center' : ''} ${
                    location.pathname === fullTo
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                </Link>
              )
            })}

            {activeWorkspace && (
              <div>
                <button
                  onClick={() => setProjectsOpen(!projectsOpen)}
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors ${isCollapsed ? 'lg:justify-center' : ''}`}
                >
                  <span className={isCollapsed ? 'lg:hidden' : ''}>Quick Projects</span>
                  <ChevronDown size={12} className={`transition-transform ${projectsOpen ? '' : '-rotate-90'} ${isCollapsed ? 'lg:hidden' : ''}`} />
                  {isCollapsed && <Folder size={14} className="hidden lg:block text-gray-400" title="Quick Projects" />}
                </button>

                {projectsOpen && (
                  <div className="mt-1 space-y-0.5">
                    {projects.map((project) => {
                      const projectPath = `/workspaces/${activeWorkspace.slug}/projects/${project.id}`
                      const isActive = location.pathname === projectPath

                      return (
                        <Link
                          key={project.id}
                          to={projectPath}
                          onClick={() => {
                            setActiveProject(project)
                            setMobileOpen(false)
                          }}
                          title={project.name}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isCollapsed ? 'lg:justify-center' : ''} ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                          <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{project.name}</span>
                        </Link>
                      )
                    })}

                    {canCreateProject(currentUserRole) && (
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
                              if (isCollapsed) {
                                toggleCollapse()
                              }
                              setCreating(true)
                              setProjectError('')
                            }}
                            title="New project"
                            className={`flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-50 ${isCollapsed ? 'lg:justify-center' : ''}`}
                          >
                            <Plus size={14} />
                            <span className={isCollapsed ? 'lg:hidden' : ''}>New project</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={`px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ${isCollapsed ? 'lg:hidden' : ''}`}>Settings</label>
              <div className="space-y-0.5">
                {settingsItems.map((item) => {
                  const Icon = item.icon
                  const fullTo = activeWorkspace && item.wsRelative
                    ? `/workspaces/${activeWorkspace.slug}${item.to}`
                    : item.to
                  return (
                    <Link
                      key={item.label}
                      to={fullTo}
                      onClick={() => setMobileOpen(false)}
                      title={item.label}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isCollapsed ? 'lg:justify-center' : ''} ${
                        location.pathname === fullTo
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      <span className={isCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="px-3 py-4 border-t border-gray-100">
            <div className={`flex items-center gap-3 px-3 py-2 mb-1 ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`} title={user?.email}>
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700 flex-shrink-0">
                {initials}
              </div>
              <span className={`text-xs text-gray-600 truncate flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>{user?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign out"
              className={`flex items-center gap-3 px-3 py-2 w-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60 ${isCollapsed ? 'lg:justify-center' : ''}`}
            >
              <LogOut size={15} className="flex-shrink-0" />
              <span className={isCollapsed ? 'lg:hidden' : ''}>{signingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
            {accountError && !isCollapsed && (
              <p className="mt-2 px-3 text-xs text-red-500">{accountError}</p>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}