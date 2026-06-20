import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useTaskStore } from '../store/taskStore'
import KanbanBoard from '../components/tasks/KanbanBoard'

export default function ProjectPage() {
  const { id } = useParams()
  const projects = useProjectStore((state) => state.projects)
  const setActiveProject = useProjectStore((state) => state.setActiveProject)
  const activeProject = useProjectStore((state) => state.activeProject)
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
        <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden p-6">
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
      </div>
    </div>
  )
}
