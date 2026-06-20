import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, CheckSquare, Settings, LogOut, Plus, ChevronDown, Menu, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useProjectStore } from '../../store/projectStore'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: CheckSquare, label: 'My tasks', to: '/my-tasks' },
  { icon: Settings, label: 'Settings', to: '/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const { projects, activeProject, setActiveProject, createProject } = useProjectStore()
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    await createProject({ name: newName.trim() })
    setNewName('')
    setCreating(false)
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">W</span>
        </div>
        <span className="font-semibold text-gray-900 text-sm">Work Orbit</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              location.pathname === to
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

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
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/project/${project.id}`}
                  onClick={() => { setActiveProject(project); setMobileOpen(false) }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeProject?.id === project.id
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}

              {creating ? (
                <form onSubmit={handleCreateProject} className="px-3 pt-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Project name"
                    className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button type="submit" className="text-xs text-indigo-600 font-medium hover:text-indigo-800">Add</button>
                    <button type="button" onClick={() => setCreating(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-50"
                >
                  <Plus size={14} />
                  New project
                </button>
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
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 w-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  )

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
        <SidebarContent />
      </aside>
    </>
  )
}
