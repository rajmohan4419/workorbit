import { useEffect, useState } from 'react'
import { digestService } from '../../lib/services/digestService'
import { Activity, CheckCircle2, Clock, AlertCircle, TrendingUp, Loader2 } from 'lucide-react'

export default function ProjectDigest({ projectId }) {
  const [digest, setDigest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDigest() {
      const data = await digestService.getProjectDigest(projectId)
      setDigest(data)
      setLoading(false)
    }
    fetchDigest()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    )
  }

  const { stats, recentActivity } = digest

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-indigo-600 mb-2">
            <CheckCircle2 size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Completion</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">{stats.completedTasks} of {stats.totalTasks} tasks done</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <Clock size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Time Spent</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalHours}h</p>
          <p className="text-xs text-gray-500 mt-1">Logged this week</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <AlertCircle size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Blocked</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.blockedTasks}</p>
          <p className="text-xs text-gray-500 mt-1">Tasks need attention</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-indigo-600 mb-2">
            <TrendingUp size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Velocity</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">High</p>
          <p className="text-xs text-gray-500 mt-1">Based on recent activity</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
          <Activity size={18} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-gray-900">Recent Highlights</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No significant activity recorded this week.
            </div>
          ) : (
            recentActivity.slice(0, 5).map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                  <Activity size={14} />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-bold text-gray-900">{log.profiles?.full_name}</span>
                    {' '}{log.type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
