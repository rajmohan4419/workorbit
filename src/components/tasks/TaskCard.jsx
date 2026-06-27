import { useState, useRef, useEffect, memo } from 'react'
import { Calendar, Trash2, Edit2, Check, X, MessageSquare, Paperclip, AlertCircle } from 'lucide-react'
import { useTaskStore } from '../../store/taskStore'
import { useAuthStore } from '../../store/authStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { canDeleteTask, canEditTaskMetadata } from '../../lib/permissions'

const priorityStyles = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-gray-50 text-gray-500 border-gray-100',
}

const TaskCard = memo(function TaskCard({ task, onOpen }) {
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const user = useAuthStore((state) => state.user)
  const wsRole = useWorkspaceStore((state) => state.currentUserRole)
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
  const canDelete = canDeleteTask(wsRole, user?.id, task.created_by)
  const canEdit = canEditTaskMetadata(wsRole, user?.id, task.created_by, task.assigned_to)

  // Use pre-fetched data from task object
  const taskSubtasks = task.task_subtasks || []
  const taskLabels = (task.task_labels || []).map(tl => tl.labels).filter(Boolean)
  const commentCount = task.task_comments?.[0]?.count || 0
  const attachmentCount = task.task_attachments?.[0]?.count || 0
  const taskAssignee = task.profiles

  return (
    <div
      onClick={() => onOpen(task)}
      className="group bg-white border border-gray-100 rounded-xl p-3.5 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {task.is_blocked && (
          <div className="flex-shrink-0 mt-0.5" title="Task is blocked">
            <AlertCircle size={14} className="text-red-500" />
          </div>
        )}
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
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
                className="opacity-0 group-hover/title:opacity-100 p-1 text-gray-300 hover:text-indigo-600 transition-all rounded flex-shrink-0"
              >
                <Edit2 size={11} />
              </button>
            )}
          </div>
        )}
        
        {canDelete && !isEditing && (
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

      {taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {taskLabels.slice(0, 3).map(label => (
            <div
              key={label.id}
              className="w-8 h-1 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
          {taskLabels.length > 3 && <span className="text-[8px] text-gray-400">+{taskLabels.length - 3}</span>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${priorityStyles[task.priority] || priorityStyles.medium}`}>
            {task.priority}
          </span>

          <div className="flex items-center gap-2 text-gray-400">
            {commentCount > 0 && (
              <div className="flex items-center gap-0.5 text-[10px]">
                <MessageSquare size={10} />
                {commentCount}
              </div>
            )}
            {attachmentCount > 0 && (
              <div className="flex items-center gap-0.5 text-[10px]">
                <Paperclip size={10} />
                {attachmentCount}
              </div>
            )}
          </div>
        </div>

        {task.due_date && (
          <div className={`flex items-center gap-1 text-[10px] font-medium ${isOverdue ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded' : 'text-gray-400'}`}>
            <Calendar size={10} />
            {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {taskSubtasks.length > 0 ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(taskSubtasks.filter(s => s.is_completed).length / taskSubtasks.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
              {taskSubtasks.filter(s => s.is_completed).length}/{taskSubtasks.length}
            </span>
          </div>
        ) : <div className="flex-1" />}

        {taskAssignee && (
          <div
            className="w-5 h-5 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[8px] font-bold text-indigo-700 shadow-sm overflow-hidden"
            title={taskAssignee.full_name}
          >
            {taskAssignee.avatar_path ? (
              <img src={taskAssignee.avatar_path} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              taskAssignee.full_name?.slice(0, 2).toUpperCase() || 'U'
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="mt-2 text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  )
})

export default TaskCard
