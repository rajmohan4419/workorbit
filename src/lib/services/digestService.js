import { supabase } from '../supabase'

export const digestService = {
  async getProjectDigest(projectId) {
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    const last7DaysStr = last7Days.toISOString()

    const [logs, timeLogs, tasks] = await Promise.all([
      supabase
        .from('task_logs')
        .select('*, tasks!inner(project_id), profiles(full_name)')
        .eq('tasks.project_id', projectId)
        .gte('created_at', last7DaysStr)
        .order('created_at', { ascending: false }),
      supabase
        .from('time_logs')
        .select('*, tasks!inner(project_id)')
        .eq('tasks.project_id', projectId)
        .gte('created_at', last7DaysStr),
      supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
    ])

    const totalTasks = tasks.data?.length || 0
    const completedTasks = tasks.data?.filter(t => t.status === 'done').length || 0
    const blockedTasks = tasks.data?.filter(t => t.is_blocked).length || 0

    const totalSeconds = timeLogs.data?.reduce((acc, log) => acc + log.duration_seconds, 0) || 0
    const totalHours = (totalSeconds / 3600).toFixed(1)

    const recentActivity = logs.data || []

    return {
      stats: {
        totalTasks,
        completedTasks,
        blockedTasks,
        totalHours,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      recentActivity
    }
  }
}
