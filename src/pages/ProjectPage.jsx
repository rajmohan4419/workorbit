import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Users, LayoutDashboard, Trash2 } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore } from '../store/authStore'
import { useTaskStore } from '../store/taskStore'
import { canDeleteProject } from '../lib/permissions'
import KanbanBoard from '../components/tasks/KanbanBoard'
import ProjectMembers from '../components/layout/ProjectMembers'
import NotificationBell from '../components/layout/NotificationBell'

export default function ProjectPage() {
  const { id } = useParams()
  const [view, setView] = useState('board')
  const projects = useProjectStore((state) => state.projects)
  const setActiveProject = useProjectStore((state) => state.setActiveProject)
  const activeProject = useProjectStore((state) => state.activeProject)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const user = useAuthStore((state) => state.user)
  const fetchTasks = useTaskStore((state) => state.fetchTasks)
  const resetTasks = useTaskStore((state) => state.reset)
  const loading = useTaskStore((state) => state.loading)
  const error = useTaskStore((state) => state.error)

  useEffect(() => {
    const project = projects.find((item) => item.id === id) ?? null
    setActiveProject(project)

    if (id) fetchTasks(id)
    else resetTasks()
  }, [id, projects, setActiveProject, fetchTasks, resetTasks])

  const project = activeProject?.id === id ? activeProject : projects.find((p) => p.id === id)

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project? All tasks will be permanently removed.')) {
      await deleteProject(id)
      window.location.href = '/'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">{project?.name || 'Project'}</h1>
            {project?.description && (
              <p className="text-xs text-gray-400">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDeleteProject(user?.id, project?.owner_id) && (
            <button
              onClick={handleDeleteProject}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Project"
            >
              <Trash2 size={16} />
            </button>
          )}
          <NotificationBell />
          <div className="w-px h-6 bg-gray-100 mx-1" />
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
            <button
              onClick={() => setView('board')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'board' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LayoutDashboard size={14} />
              Board
            </button>
            <button
              onClick={() => setView('members')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'members' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Users size={14} />
              Members
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {view === 'members' ? (
          <div className="max-w-3xl mx-auto">
            <ProjectMembers projectId={id} />
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-72 h-48 bg-gray-50 rounded-2xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : (
              <KanbanBoard projectId={id} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
