import { useState, useMemo } from 'react'
import { CheckCircle2, Clock, AlertCircle, Calendar, Tag } from 'lucide-react'
import { useTaskStore, STATUS_LABELS } from '../store/taskStore'
import TaskModal from '../components/tasks/TaskModal'

const priorityStyles = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-gray-50 text-gray-500 border-gray-100',
}

export default function MyTasksPage() {
  const tasks = useTaskStore((state) => state.tasks)
  const loading = useTaskStore((state) => state.loading)
  const error = useTaskStore((state) => state.error)
  const [selectedTask, setSelectedTask] = useState(null)

  const overdueCount = useMemo(() =>
    tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
  , [tasks])

  const completedCount = useMemo(() =>
    tasks.filter(t => t.status === 'done').length
  , [tasks])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">My tasks</h1>
        <p className="text-gray-400 text-sm mt-1">Everything assigned to you across all projects.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Assigned to you', value: tasks.length, icon: Tag, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
          { label: 'Overdue', value: overdueCount, icon: AlertCircle, color: 'text-red-500 bg-red-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Task</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Due date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-50 rounded w-1/2" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-red-500 text-sm">{error}</td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-300">
                    <Clock size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No tasks assigned to you yet.</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                  
                  return (
                    <tr 
                      key={task.id} 
                      onClick={() => setSelectedTask(task)}
                      className="group hover:bg-gray-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{task.title}</div>
                        {task.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-[10px] font-medium text-gray-500">
                          {task.projects?.name || 'Untitled Project'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600">{STATUS_LABELS[task.status]}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-tight ${priorityStyles[task.priority] || priorityStyles.medium}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.due_date ? (
                          <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            <Calendar size={12} />
                            {new Date(task.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={selectedTask.project_id}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
