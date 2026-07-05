import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS } from '../../store/taskStore'
import { History } from 'lucide-react'

export default function ActivityFeed({ projectId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      let query = supabase
        .from('task_logs')
        .select('*, profiles!task_logs_user_id_fkey(full_name, avatar_path), tasks!inner(title, project_id)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (projectId) {
        query = query.eq('tasks.project_id', projectId)
      }

      const { data } = await query

      if (data) setActivities(data)
      setLoading(false)
    }

    fetchActivities()

    // Subscribe to new logs
    const channelId = projectId ? `project-activities-${projectId}` : 'global-activities'
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_logs' }, async (payload) => {
        // Fetch full record with joins
        const { data: newLog } = await supabase
          .from('task_logs')
          .select('*, profiles!task_logs_user_id_fkey(full_name, avatar_path), tasks!inner(title, project_id)')
          .eq('id', payload.new.id)
          .single()

        if (newLog) {
          if (!projectId || newLog.tasks.project_id === projectId) {
            setActivities(prev => [newLog, ...prev].slice(0, 20))
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  if (loading) return <div className="animate-pulse space-y-4 pt-4 px-2">
    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl" />)}
  </div>

  if (activities.length === 0) return (
    <div className="text-center py-12 text-gray-400">
      <History size={32} className="mx-auto mb-2 opacity-20" />
      <p className="text-sm font-medium">No activity yet.</p>
    </div>
  )

  return (
    <div className="space-y-4 p-2 overflow-y-auto max-h-full">
      {activities.map((log) => (
        <div key={log.id} className="flex gap-3 group">
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0 border border-gray-100 overflow-hidden shadow-sm">
            {log.profiles?.avatar_path ? (
              <img src={log.profiles.avatar_path} alt="" className="w-full h-full object-cover" />
            ) : (
              log.profiles?.full_name?.slice(0, 2).toUpperCase() || 'SYS'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-gray-900">{log.profiles?.full_name || 'System'}</span>
              {' '}
              {log.type === 'status_change' ? (
                <>
                  moved <span className="font-medium text-indigo-600">"{log.tasks?.title}"</span> from <span className="font-medium">{STATUS_LABELS[log.old_value]}</span> to <span className="font-medium text-emerald-600">{STATUS_LABELS[log.new_value]}</span>
                </>
              ) : log.type === 'comment_added' ? (
                <>
                  commented on <span className="font-medium text-indigo-600">"{log.tasks?.title}"</span>: <span className="italic text-gray-400">"{log.new_value}..."</span>
                </>
              ) : log.type === 'assignment_change' ? (
                <>
                  reassigned <span className="font-medium text-indigo-600">"{log.tasks?.title}"</span> from <span className="font-medium">{log.metadata?.old_name || 'Unassigned'}</span> to <span className="font-medium text-indigo-600">{log.metadata?.new_name || 'Unassigned'}</span>
                </>
              ) : log.type === 'task_created' ? (
                <>
                  created task <span className="font-medium text-indigo-600">"{log.tasks?.title}"</span>
                </>
              ) : log.type === 'due_date_change' ? (
                <>
                  changed due date for <span className="font-medium text-indigo-600">"{log.tasks?.title}"</span> to <span className="font-medium">{log.new_value || 'None'}</span>
                </>
              ) : (
                <>performed an action on <span className="font-medium text-indigo-600">"{log.tasks?.title}"</span></>
              )}
            </p>
            <span className="text-[10px] text-gray-400 mt-1 block">
              {new Date(log.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
