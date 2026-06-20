import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, AlertCircle, ArrowRight, Activity, TrendingUp, Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore } from '../store/authStore'
import OnboardingChecklist from '../components/dashboard/OnboardingChecklist'
import ActivityFeed from '../components/tasks/ActivityFeed'

export default function DashboardPage() {
  const projects = useProjectStore((state) => state.projects)
  const loading = useProjectStore((state) => state.loading)
  const error = useProjectStore((state) => state.error)
  const user = useAuthStore((state) => state.user)
  const firstName = user?.email?.split('@')[0] || 'there'

  const [overdueCount, setOverdueCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [teamHealth, setTeamHealth] = useState(100)

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date().toISOString()
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [overdue, completed, totalTasks, doneTasks, noDueTasks, futureDueTasks] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).lt('due_date', now).neq('status', 'done'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done').gte('updated_at', oneWeekAgo),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).is('due_date', null).neq('status', 'done'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).gt('due_date', now).neq('status', 'done')
      ])

      if (overdue.count !== null) setOverdueCount(overdue.count)
      if (completed.count !== null) setCompletedCount(completed.count)

      const total = totalTasks.count || 0
      if (total === 0) {
        setTeamHealth(100)
      } else {
        const healthy = (doneTasks.count || 0) + (noDueTasks.count || 0) + (futureDueTasks.count || 0)
        setTeamHealth(Math.round((healthy / total) * 100))
      }
    }
    fetchStats()
  }, [])

  const overdueTasks = overdueCount
  const completedThisWeek = completedCount

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
            <ActivityFeed projectId={projects[0]?.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
