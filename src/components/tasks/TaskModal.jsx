import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTaskStore, STATUSES, STATUS_LABELS, PRIORITIES } from '../../store/taskStore'

function getInitialForm(task, defaultStatus, currentUserId) {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? 'medium',
    due_date: task?.due_date?.slice(0, 10) ?? '',
    assigned_to: task?.assigned_to ?? currentUserId ?? '',
  }
}

export default function TaskModal({ task = null, projectId = null, defaultStatus = 'todo', onClose }) {
  const currentUser = useAuthStore((state) => state.user)
  const createTask = useTaskStore((state) => state.createTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const isEditing = Boolean(task)
  const [form, setForm] = useState(() => getInitialForm(task, defaultStatus, currentUser?.id))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleChange = (field, value) => setForm((currentForm) => ({ ...currentForm, [field]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) {
      setErrorMessage('Title is required.')
      return
    }

    setSaving(true)
    setErrorMessage('')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
    }

    const result = isEditing
      ? await updateTask(task.id, { ...payload, status: form.status })
      : await createTask({
          ...payload,
          status: defaultStatus,
          project_id: projectId,
        })

    setSaving(false)

    if (result.error) {
      setErrorMessage(result.error.message)
      return
    }

    if (!isEditing) {
      onClose()
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const heading = isEditing ? 'Task details' : 'Add task'
  const badgeStatus = STATUS_LABELS[isEditing ? form.status : defaultStatus]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">{heading}</p>
            <span className="mt-1 inline-flex text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {badgeStatus}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">Title *</label>
            <input
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder-gray-300"
            />
          </div>

          <div className={`grid gap-3 pt-2 ${isEditing ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {isEditing && (
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Due date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Assignee</label>
              <select
                value={form.assigned_to}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Unassigned</option>
                {currentUser && (
                  <option value={currentUser.id}>{currentUser.email}</option>
                )}
              </select>
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-500">{errorMessage}</p>
          )}

          {!isEditing && !projectId && (
            <p className="text-sm text-red-500">A project is required before creating a task.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!isEditing && !projectId)}
            className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEditing ? (saved ? 'Saved!' : 'Save changes') : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  )
}
