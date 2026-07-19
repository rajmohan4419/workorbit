import { useState, useEffect, useCallback } from 'react'
import { Zap, Calendar, Target, Plus, ChevronRight, X, Loader2 } from 'lucide-react'
import { useTaskStore } from '../../store/taskStore'
import { useProjectStore } from '../../store/projectStore'
import { sprintService } from '../../lib/services/sprintService'
import { analyticsService } from '../../lib/services/analyticsService'

export default function SprintBoard({ projectId }) {
  const [sprints, setSprints] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const tasks = useTaskStore((state) => state.tasks)
  const fetchSprints = useProjectStore((state) => state.fetchSprints)

  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    goal: ''
  })

  const loadSprints = useCallback(async () => {
    setLoading(true)
    const { data } = await fetchSprints(projectId)
    if (data) setSprints(data)
    setLoading(false)
  }, [projectId, fetchSprints])

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      if (!ignore) {
        await loadSprints();
      }
    }
    init();
    return () => { ignore = true; };
  }, [loadSprints])

  const handleCreateSprint = async (e) => {
    e.preventDefault()
    if (!form.name || !form.start_date || !form.end_date) {
      setError('Please fill in all required fields.')
      return
    }

    setCreating(true)
    setError('')
    const { data, error: createError } = await sprintService.createSprint({
      project_id: projectId,
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      goal: form.goal,
      status: 'planned'
    })

    if (createError) {
      setError(createError.message)
      setCreating(false)
    } else {
      analyticsService.track('Sprint Created', {
        sprintId: data?.id,
        name: form.name,
        projectId,
      })
      await loadSprints()
      setCreating(false)
      setShowCreateModal(false)
      setForm({ name: '', start_date: '', end_date: '', goal: '' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Zap size={18} className="text-indigo-600" />
            Sprints
          </h2>
          <p className="text-xs text-gray-500">Manage iterations and project velocity</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          Plan Sprint
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Plan New Sprint</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Sprint Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sprint 1, Q1 Iteration"
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date *</label>
                  <input
                    required
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date *</label>
                  <input
                    required
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Goal</label>
                <textarea
                  value={form.goal}
                  onChange={e => setForm({ ...form, goal: e.target.value })}
                  placeholder="What are we achieving this sprint?"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => <div key={i} className="h-32 bg-gray-50 rounded-2xl" />)}
          </div>
        ) : sprints.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-12 text-center">
            <Target size={40} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-sm font-bold text-gray-900 mb-1">No sprints planned</h3>
            <p className="text-xs text-gray-400">Start your first sprint to track team velocity.</p>
          </div>
        ) : (
          sprints.map(sprint => {
            const sprintTasks = tasks.filter(t => t.sprint_id === sprint.id)
            const totalTasks = sprintTasks.length
            const completedTasks = sprintTasks.filter(t => t.status === 'done').length
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

            // Get unique assignees for this sprint
            const assignees = Array.from(new Set(sprintTasks.map(t => t.assigned_to).filter(Boolean)))
              .map(id => sprintTasks.find(t => t.assigned_to === id)?.profiles)
              .filter(Boolean)

            return (
              <div key={sprint.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-indigo-200 transition-all cursor-pointer group shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">{sprint.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        sprint.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {sprint.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target size={12} />
                        {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>

                {sprint.goal && (
                  <p className="text-xs text-gray-500 mb-4 line-clamp-1 italic">"{sprint.goal}"</p>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {assignees.map((assignee) => (
                      <div
                        key={assignee.id}
                        className="w-6 h-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600 overflow-hidden shadow-sm"
                        title={assignee.full_name}
                      >
                        {assignee.avatar_path ? (
                          <img src={assignee.avatar_path} alt="" className="w-full h-full object-cover" />
                        ) : (
                          assignee.full_name?.slice(0, 2).toUpperCase() || 'U'
                        )}
                      </div>
                    ))}
                    {assignees.length === 0 && (
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[8px] font-bold text-gray-300">
                        ?
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
