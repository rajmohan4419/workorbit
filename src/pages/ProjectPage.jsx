import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, Users, LayoutDashboard, Trash2, History, Zap, Calendar, List, GanttChartSquare, FileText, Share2, Globe, Plus, X, Cpu } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { analyticsService } from '../lib/services/analyticsService'
import { useTaskStore } from '../store/taskStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { canDeleteProject, canCreateTask } from '../lib/permissions'
import KanbanBoard from '../components/tasks/KanbanBoard'
import TaskTable from '../components/tasks/TaskTable'
import TaskModal from '../components/tasks/TaskModal'
import ActivityFeed from '../components/tasks/ActivityFeed'
import SprintBoard from '../components/tasks/SprintBoard'
import TimelineView from '../components/tasks/TimelineView'
import ProjectDigest from '../components/tasks/ProjectDigest'
import ProjectMembers from '../components/layout/ProjectMembers'
import NotificationBell from '../components/layout/NotificationBell'
import AutomationBuilder from '../components/tasks/AutomationBuilder'

const getProjectPrefix = (name) => {
  if (!name) return 'TASK'
  const words = name.trim().split(/\s+/)
  const prefix = words.map(w => w[0]).join('').toUpperCase()
  return prefix || 'TASK'
}

export default function ProjectPage() {
  const { id : projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const view = useMemo(() => {
    const parts = location.pathname.split('/')
    const lastPart = parts[parts.length - 1]
    return ['board', 'list', 'timeline', 'activity', 'sprints', 'members', 'calendar', 'digest', 'automations'].includes(lastPart) ? lastPart : 'board'
  }, [location.pathname])

  const [toasts, setToasts] = useState([])
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)

  const [selectedTask, setSelectedTask] = useState(null)
  const projects = useProjectStore((state) => state.projects)
  const setActiveProject = useProjectStore((state) => state.setActiveProject)
  const activeProject = useProjectStore((state) => state.activeProject)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const wsRole = useWorkspaceStore((state) => state.currentUserRole)
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace)
  const tasks = useTaskStore((state) => state.tasks)
  const subscribeToProject = useTaskStore((state) => state.subscribeToProject)
  const resetTasks = useTaskStore((state) => state.reset)
  const loading = useTaskStore((state) => state.loading)
  const error = useTaskStore((state) => state.error)

  useEffect(() => {
    const project = projects.find((item) => item.id === projectId) ?? null
    setActiveProject(project)

    if (projectId) {
      const unsubscribe = subscribeToProject(projectId)
      return () => unsubscribe?.()
    } else {
      resetTasks()
    }
  }, [projectId, projects, setActiveProject, resetTasks, subscribeToProject])

  useEffect(() => {
    if (projectId && view === 'board') {
      analyticsService.track('Board Viewed', { projectId })
    }
  }, [projectId, view])

  const project = activeProject?.id === projectId ? activeProject : projects.find((p) => p.id === projectId)
  const updateProject = useProjectStore(state => state.updateProject)

  const handleTogglePublic = async () => {
    await updateProject(projectId, { is_public: !project?.is_public })
  }

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project? All tasks will be permanently removed.')) {
      await deleteProject(projectId)
      navigate(activeWorkspace ? `/workspaces/${activeWorkspace.slug}` : '/')
    }
  }

  const triggerToast = useCallback((task) => {
    const prefix = getProjectPrefix(project?.name)
    const taskNum = tasks.findIndex(t => t.id === task.id) + 1 || tasks.length + 1
    const taskId = `${prefix}${taskNum}`

    const id = Date.now()
    const newToast = {
      id,
      taskId,
      title: task.title,
    }
    setToasts(prev => [...prev, newToast])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [project?.name, tasks])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to={activeWorkspace ? `/workspaces/${activeWorkspace.slug}` : "/"} className="text-gray-400 hover:text-gray-700 transition-colors">
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
          {canDeleteProject(wsRole) && (
            <button
              onClick={handleDeleteProject}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Project"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={handleTogglePublic}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-2 border ${
              project?.is_public
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'text-gray-400 hover:text-gray-600 border-transparent hover:border-gray-200'
            }`}
            title={project?.is_public ? 'Roadmap is Public' : 'Roadmap is Private'}
          >
            {project?.is_public ? <Globe size={16} /> : <Share2 size={16} />}
            {project?.is_public && <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">Public</span>}
          </button>

          {project?.is_public && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/public/projects/${projectId}`
                navigator.clipboard.writeText(url)
                alert('Public roadmap link copied to clipboard!')
              }}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
              title="Copy Public Link"
            >
              <Share2 size={16} />
            </button>
          )}

          {canCreateTask(wsRole) && (
            <>
              <button
                onClick={() => setShowCreateTaskModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-100 flex-shrink-0"
              >
                <Plus size={14} />
                <span>Create Task</span>
              </button>
              <div className="w-px h-6 bg-gray-100 mx-1" />
            </>
          )}

          <NotificationBell />
          <div className="w-px h-6 bg-gray-100 mx-1" />
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl max-w-[200px] sm:max-w-none overflow-x-auto no-scrollbar">
            {[
              { id: 'board', label: 'Board', icon: LayoutDashboard },
              { id: 'list', label: 'List', icon: List },
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
              { id: 'activity', label: 'Feed', icon: History },
              { id: 'digest', label: 'Digest', icon: FileText },
              { id: 'sprints', label: 'Sprints', icon: Zap },
              { id: 'automations', label: 'Automations', icon: Cpu },
              { id: 'members', label: 'Members', icon: Users },
            ].map((v) => (
              <Link
                key={v.id}
                to={`/workspaces/${activeWorkspace?.slug}/projects/${projectId}/${v.id}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                  view === v.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <v.icon size={14} />
                <span className="hidden md:inline">{v.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {view === 'members' ? (
          <div className="max-w-3xl mx-auto">
            <ProjectMembers projectId={projectId} />
          </div>
        ) : view === 'list' ? (
          <div className="h-full overflow-y-auto">
            <TaskTable tasks={tasks} onTaskClick={setSelectedTask} />
          </div>
        ) : view === 'activity' ? (
          <div className="max-w-2xl mx-auto h-full overflow-hidden flex flex-col bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
              <History size={16} className="text-indigo-600" />
              Project Activity
            </h2>
            <div className="flex-1 overflow-y-auto">
              <ActivityFeed projectId={projectId} />
            </div>
          </div>
        ) : view === 'sprints' ? (
          <div className="max-w-4xl mx-auto h-full overflow-y-auto">
            <SprintBoard projectId={projectId} />
          </div>
        ) : view === 'timeline' ? (
          <div className="h-full overflow-hidden">
            <TimelineView tasks={tasks} />
          </div>
        ) : view === 'digest' ? (
          <div className="max-w-5xl mx-auto h-full overflow-y-auto">
            <ProjectDigest projectId={projectId} />
          </div>
        ) : view === 'automations' ? (
          <div className="h-full overflow-hidden">
            <AutomationBuilder key={projectId} projectId={projectId} />
          </div>
        ) : view === 'calendar' ? (
          <div className="h-full overflow-hidden p-8 text-center text-gray-400">
             Calendar View (Coming Soon)
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
              <KanbanBoard projectId={projectId} onTaskCreated={triggerToast} />
            )}
          </>
        )}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {showCreateTaskModal && (
        <TaskModal
          projectId={projectId}
          defaultStatus="todo"
          onClose={() => setShowCreateTaskModal(false)}
          onTaskCreated={triggerToast}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white border border-gray-100 shadow-xl rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-right-5 fade-in duration-300 max-w-sm"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
              ✓
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5">Task Created</p>
              <p className="text-sm font-bold text-gray-900">{toast.taskId}</p>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{toast.title}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-auto text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors hover:bg-gray-50"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
