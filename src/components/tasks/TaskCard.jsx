import { useState } from 'react'
import { Calendar, Trash2 } from 'lucide-react'
import { useTaskStore } from '../../store/taskStore'
import { useAuthStore } from '../../store/authStore'
import { canDeleteTask } from '../../lib/permissions'

const priorityStyles = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-gray-50 text-gray-500 border-gray-100',
}

export default function TaskCard({ task, onOpen }) {
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const profile = useAuthStore((state) => state.profile)
  const [deleting, setDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleDelete = async (e) => {
    e.stopPropagation()
    setDeleting(true)
    setErrorMessage('')

    const { error } = await deleteTask(task.id)
    if (error) {
      setDeleting(false)
      setErrorMessage(error.message)
    }
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div
      onClick={() => onOpen(task)}
      className="group bg-white border border-gray-100 rounded-xl p-3.5 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{task.title}</p>
        {canDeleteTask(profile?.role) && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all rounded"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-400 mb-2.5 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityStyles[task.priority] || priorityStyles.medium}`}>
          {task.priority}
        </span>

        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
            <Calendar size={11} />
            {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="mt-2 text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  )
}
