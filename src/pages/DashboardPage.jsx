import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, AlertCircle, ArrowRight, TrendingUp, Heart, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore } from '../store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import OnboardingChecklist from '../components/dashboard/OnboardingChecklist'
import ActivityFeed from '../components/tasks/ActivityFeed'

export default function DashboardPage() {
  const projects = useProjectStore((state) => state.projects)
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace)
  const loading = useProjectStore((state) => state.loading)
  const error = useProjectStore((state) => state.error)
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const firstName = profile?.first_name || user?.email?.split('@')[0] || 'there'

  const [overdueCount, setOverdueCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalTasksCount, setTotalTasksCount] = useState(0)
  const [teamHealth, setTeamHealth] = useState(100)
  const [workload, setWorkload] = useState([])
  const [upcomingTasks, setUpcomingTasks] = useState({ today: [], tomorrow: [], week: [] })

  useEffect(() => {
    let active = true
    const fetchStats = async () => {
      if (projects.length === 0) {
        if (!active) return
        setOverdueCount(0)
        setCompletedCount(0)
        setTotalTasksCount(0)
        setTeamHealth(100)
        setWorkload([])
        setUpcomingTasks({ today: [], tomorrow: [], week: [] })
        return
      }

      const projectIds = projects.map(p => p.id)
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekStr = nextWeek.toISOString().split('T')[0]
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [overdue, completed, totalTasks, doneTasks, noDueTasks, futureDueTasks, allActiveTasks] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', projectIds).lt('due_date', todayStr).neq('status', 'done'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', projectIds).eq('status', 'done').gte('updated_at', oneWeekAgo),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', projectIds),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', projectIds).eq('status', 'done'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', projectIds).is('due_date', null).neq('status', 'done'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', projectIds).gt('due_date', todayStr).neq('status', 'done'),
        supabase.from('tasks').select('*, profiles!tasks_assigned_to_fkey(full_name)').in('project_id', projectIds).neq('status', 'done').order('due_date', { ascending: true })
      ])

      if (!active) return

      if (overdue.count !== null) setOverdueCount(overdue.count)
      if (completed.count !== null) setCompletedCount(completed.count)
      if (totalTasks.count !== null) setTotalTasksCount(totalTasks.count)

      const total = totalTasks.count || 0
      if (total === 0) {
        setTeamHealth(100)
      } else {
        const healthy = (doneTasks.count || 0) + (noDueTasks.count || 0) + (futureDueTasks.count || 0)
        setTeamHealth(Math.round((healthy / total) * 100))
      }

      // Calculate workload
      if (allActiveTasks.data) {
        const counts = {}
        allActiveTasks.data.forEach(t => {
          const name = t.profiles?.full_name || 'Unassigned'
          counts[name] = (counts[name] || 0) + 1
        })
        const workloadData = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
        setWorkload(workloadData)

        // Group upcoming
        const upcoming = { today: [], tomorrow: [], week: [] }
        allActiveTasks.data.forEach(t => {
          if (!t.due_date) return
          if (t.due_date === todayStr) upcoming.today.push(t)
          else if (t.due_date === tomorrowStr) upcoming.tomorrow.push(t)
          else if (t.due_date > tomorrowStr && t.due_date <= nextWeekStr) upcoming.week.push(t)
        })
        setUpcomingTasks(upcoming)
      }
    }
    fetchStats()
    return () => { active = false }
  }, [projects, activeWorkspace])

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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        {[
          { label: 'Team Health', value: `${teamHealth}%`, icon: Heart, color: 'text-rose-600 bg-rose-50' },
          { label: 'Completion Rate', value: `${totalTasksCount > 0 ? Math.round(((totalTasksCount - (totalTasksCount - completedCount)) / totalTasksCount) * 100) : 0}%`, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
          { label: 'Done this week', value: completedThisWeek, icon: Check, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Overdue', value: overdueTasks, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
          { label: 'Projects', value: projects.length, icon: FolderOpen, color: 'text-indigo-600 bg-indigo-50' },
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
                to={activeWorkspace ? `/workspaces/${activeWorkspace.slug}/projects/${project.id}` : `/projects/${project.id}`}
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

        <div className="lg:col-span-1 space-y-8">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Upcoming Deadlines</h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
              {Object.entries(upcomingTasks).map(([key, tasks]) => (
                <div key={key}>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{key}</h3>
                  {tasks.length === 0 ? (
                    <p className="text-[11px] text-gray-300 italic">No tasks</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {tasks.map(t => (
                        <li key={t.id} className="text-xs text-gray-600 flex items-center justify-between">
                          <span className="truncate pr-2">{t.title}</span>
                          <span className={`text-[10px] font-bold ${key === 'today' ? 'text-rose-500' : 'text-gray-400'}`}>
                            {t.due_date.split('-').reverse().slice(0, 2).join('/')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Team Workload</h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              {workload.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No active tasks</p>
              ) : (
                workload.map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-gray-700">{item.name}</span>
                      <span className="text-gray-400">{item.count} tasks</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, (item.count / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Quick Activity</h2>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm max-h-[400px] overflow-hidden">
              <ActivityFeed projectId={undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
