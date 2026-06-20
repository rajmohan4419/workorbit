import { useState, useRef, useEffect } from 'react'
import { Calendar, Trash2, Edit2, Check, X, MessageSquare, Paperclip } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTaskStore } from '../../store/taskStore'
import { useProjectStore } from '../../store/projectStore'
import { useAuthStore } from '../../store/authStore'
import { canDeleteTask, canEditTaskMetadata } from '../../lib/permissions'

const priorityStyles = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-gray-50 text-gray-500 border-gray-100',
}

export default function TaskCard({ task, onOpen }) {
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const projects = useProjectStore((state) => state.projects)
  const project = projects.find(p => p.id === task.project_id)
  const [deleting, setDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [saving, setSaving] = useState(false)
  const [taskSubtasks, setTaskSubtasks] = useState([])
  const [taskLabels, setTaskLabels] = useState([])
  const [commentCount, setCommentCount] = useState(0)
  const [attachmentCount, setAttachmentCount] = useState(0)
  const [assignee] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const fetchCardData = async () => {
      const [sub, lab, comm, att] = await Promise.all([
        supabase.from('task_subtasks').select('*').eq('task_id', task.id),
        supabase.from('task_labels').select('labels(*)').eq('task_id', task.id),
        supabase.from('task_comments').select('id', { count: 'exact' }).eq('task_id', task.id),
        supabase.from('task_attachments').select('id', { count: 'exact' }).eq('task_id', task.id)
      ])

      if (sub.data) setTaskSubtasks(sub.data)
      if (lab.data) setTaskLabels(lab.data.map(l => l.labels))
      if (comm.count !== null) setCommentCount(comm.count)
      if (att.count !== null) setAttachmentCount(att.count)
    }
    fetchCardData()

    // Realtime listeners for this specific card's metadata
    const subChannel = supabase.channel(`task-meta-${task.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_subtasks', filter: `task_id=eq.${task.id}` }, fetchCardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_labels', filter: `task_id=eq.${task.id}` }, fetchCardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` }, fetchCardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_attachments', filter: `task_id=eq.${task.id}` }, fetchCardData)
      .subscribe()

    return () => {
      supabase.removeChannel(subChannel)
    }
  }, [task.id])

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
  const canDelete = canDeleteTask(profile?.role, user?.id, project?.owner_id)
  const canEdit = canEditTaskMetadata(profile?.role, user?.id, task.created_by, task.assigned_to, project?.owner_id)
  const taskAssignee = task.profiles || assignee

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
}
