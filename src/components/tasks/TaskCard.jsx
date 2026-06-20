import { useState, useRef, useEffect } from 'react'
import { Calendar, Trash2, Edit2, Check, X } from 'lucide-react'
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
  const updateTask = useTaskStore((state) => state.updateTask)
  const profile = useAuthStore((state) => state.profile)
  const [deleting, setDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  const handleSave = async (e) => {
    e.stopPropagation()
    if (!title.trim() || title === task.title) {
      setIsEditing(false)
      setTitle(task.title)
      return
    }

    setSaving(true)
    const { error } = await updateTask(task.id, { title: title.trim() })
    setSaving(false)
    setIsEditing(false)

    if (error) setErrorMessage(error.message)
  }

  const handleCancel = (e) => {
    e.stopPropagation()
    setIsEditing(false)
    setTitle(task.title)
  }

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
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave(e)
                if (e.key === 'Escape') handleCancel(e)
              }}
              className="w-full text-sm font-medium text-gray-800 bg-gray-50 border border-indigo-300 rounded px-1 py-0.5 focus:outline-none"
            />
            <button onClick={handleSave} disabled={saving} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
              <Check size={14} />
            </button>
            <button onClick={handleCancel} className="p-0.5 text-red-400 hover:bg-red-50 rounded">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex-1 min-w-0 group/title flex items-start gap-2">
            <p className="text-sm font-medium text-gray-800 leading-snug flex-1 truncate">{task.title}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="opacity-0 group-hover/title:opacity-100 p-1 text-gray-300 hover:text-indigo-600 transition-all rounded flex-shrink-0"
            >
              <Edit2 size={11} />
            </button>
          </div>
        )}

        {canDeleteTask(profile?.role) && !isEditing && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all rounded flex-shrink-0"
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
