import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, AlertCircle, ArrowRight, Activity, TrendingUp, Heart } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore } from '../store/authStore'
import { useTaskStore } from '../store/taskStore'
import OnboardingChecklist from '../components/dashboard/OnboardingChecklist'
import ActivityFeed from '../components/tasks/ActivityFeed'

export default function DashboardPage() {
  const projects = useProjectStore((state) => state.projects)
  const loading = useProjectStore((state) => state.loading)
  const error = useProjectStore((state) => state.error)
  const user = useAuthStore((state) => state.user)
  const searchResults = useTaskStore((state) => state.searchResults)
  const fetchGlobalTasks = useTaskStore((state) => state.fetchGlobalTasks)

  useEffect(() => {
    fetchGlobalTasks()
  }, [fetchGlobalTasks])

  const firstName = user?.email?.split('@')[0] || 'there'

  const overdueTasks = searchResults.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length

  const completedThisWeek = searchResults.filter(t => {
    if (t.status !== 'done' || !t.updated_at) return false
    const date = new Date(t.updated_at)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    return diff < 7 * 24 * 60 * 60 * 1000
  }).length

  const teamHealth = searchResults.length === 0 ? 100 : Math.round(
    (searchResults.filter(t => t.status === 'done' || !t.due_date || new Date(t.due_date) > new Date()).length / searchResults.length) * 100
  )

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Good to see you, {firstName}</h1>
          <p className="text-gray-400 text-sm mt-1">Here's what's happening across your projects.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-gray-600">Workspace Live</span>
        </div>
      </div>

      <OnboardingChecklist />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Team Health', value: `${teamHealth}%`, icon: Heart, color: 'text-rose-600 bg-rose-50' },
          { label: 'Done this week', value: completedThisWeek, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Overdue Tasks', value: overdueTasks, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
          { label: 'Total Projects', value: projects.length, icon: FolderOpen, color: 'text-indigo-600 bg-indigo-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon size={16} />
            </div>
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Your projects</h2>
          </div>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : loading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <FolderOpen size={40} className="mx-auto mb-3" />
            <p className="text-sm">No projects yet. Create one from the sidebar.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="group bg-white border border-gray-100 hover:border-indigo-200 rounded-xl p-5 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <ArrowRight size={15} className="text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-xs text-gray-400">
                    Created {new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        </div>

        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Quick Activity</h2>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm min-h-[300px]">
            {projects.length > 0 ? (
              <ActivityFeed projectId={projects[0].id} />
            ) : (
              <div className="text-center py-12 text-gray-300">
                <Activity size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs">No activity to show</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
