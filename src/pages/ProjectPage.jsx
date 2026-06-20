import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useTaskStore } from '../store/taskStore'
import KanbanBoard from '../components/tasks/KanbanBoard'

export default function ProjectPage() {
  const { id } = useParams()
  const { projects, setActiveProject, activeProject } = useProjectStore()
  const { fetchTasks, loading } = useTaskStore()

  useEffect(() => {
    const project = projects.find((p) => p.id === id)
    if (project) setActiveProject(project)
    fetchTasks(id)
  }, [id, projects])

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
        ) : (
          <KanbanBoard projectId={id} />
        )}
      </div>
    </div>
  )
}
