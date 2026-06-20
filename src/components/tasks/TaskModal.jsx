import { useEffect, useState } from 'react'
import { X, Loader2, MessageSquare, History, Send, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useProjectStore } from '../../store/projectStore'
import { useTaskStore, STATUSES, STATUS_LABELS, PRIORITIES } from '../../store/taskStore'
import { canEditTaskMetadata, canComment, canEditTaskStatus } from '../../lib/permissions'

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
  const profile = useAuthStore((state) => state.profile)
  const projects = useProjectStore((state) => state.projects)
  const project = projects.find(p => p.id === projectId || p.id === task?.project_id)
  const members = useProjectStore((state) => state.members)
  const fetchMembers = useProjectStore((state) => state.fetchMembers)
  const createTask = useTaskStore((state) => state.createTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const fetchComments = useTaskStore((state) => state.fetchComments)
  const addComment = useTaskStore((state) => state.addComment)
  const deleteComment = useTaskStore((state) => state.deleteComment)
  const fetchLogs = useTaskStore((state) => state.fetchLogs)
  const comments = useTaskStore((state) => state.comments)
  const logs = useTaskStore((state) => state.logs)

  const isEditing = Boolean(task)
  const canEditMetadata = canEditTaskMetadata(profile?.role, currentUser?.id, task?.created_by, task?.assigned_to, project?.owner_id)
  const canChangeStatus = canEditTaskStatus(profile?.role, currentUser?.id, task?.created_by, task?.assigned_to, project?.owner_id)
  const canWriteComment = canComment(profile?.role)
  const [form, setForm] = useState(() => getInitialForm(task, defaultStatus, currentUser?.id))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [newComment, setNewComment] = useState('')
  const [commenting, setCommenting] = useState(false)

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (isEditing) {
      fetchComments(task.id)
      fetchLogs(task.id)
    }
    if (projectId) {
      fetchMembers(projectId)
    }
  }, [isEditing, task?.id, projectId, fetchComments, fetchLogs, fetchMembers])

  const handleChange = (field, value) => setForm((currentForm) => ({ ...currentForm, [field]: value }))

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setCommenting(true)
    const { error } = await addComment(task.id, newComment.trim())
    setCommenting(false)

    if (!error) {
      setNewComment('')
      fetchLogs(task.id)
    }
  }

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
          status: form.status || defaultStatus,
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
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1500)
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

        <div className="flex border-b border-gray-100 px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          {isEditing && (
            <>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === 'comments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageSquare size={14} />
                Comments
                {comments.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                    {comments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === 'activity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <History size={14} />
                Activity
              </button>
            </>
          )}
        </div>

        <div className="px-6 py-5">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1.5">Title *</label>
                <input
                  value={form.title}
                  disabled={isEditing && !canEditMetadata}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Task title"
                />
              </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">Description</label>
            <textarea
              value={form.description}
              disabled={isEditing && !canEditMetadata}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div className={`grid gap-3 pt-2 ${isEditing ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {isEditing && (
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1.5">Status</label>
                <select
                  value={form.status}
                  disabled={!canChangeStatus}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
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
                disabled={isEditing && !canEditMetadata}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
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
                disabled={isEditing && !canEditMetadata}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Assignee</label>
              <select
                value={form.assigned_to}
                disabled={isEditing && !canEditMetadata}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.profiles.id} value={member.profiles.id}>
                    {member.profiles.full_name} ({member.profiles.role})
                  </option>
                ))}
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
          )}

          {isEditing && activeTab === 'comments' && (
            <div className="space-y-6">
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 flex-shrink-0">
                        {comment.profiles?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-900">{comment.profiles?.full_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">
                              {new Date(comment.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {comment.user_id === currentUser?.id && (
                              <button
                                onClick={() => deleteComment(comment.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canWriteComment && (
                <form onSubmit={handleAddComment} className="relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment... (use @name to mention)"
                    rows={3}
                    className="w-full text-sm text-gray-600 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none pr-12"
                  />
                  <button
                    type="submit"
                    disabled={commenting || !newComment.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {commenting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              )}
            </div>
          )}

          {isEditing && activeTab === 'activity' && profile?.role === 'admin' && (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <History size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No activity recorded yet.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">
                      {log.profiles?.full_name?.slice(0, 2).toUpperCase() || 'SYS'}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-900">{log.profiles?.full_name || 'System'}</span>
                        {' '}
                        {log.type === 'status_change' ? (
                          <>
                            moved this task from <span className="font-medium text-indigo-600">{STATUS_LABELS[log.old_value]}</span> to <span className="font-medium text-indigo-600">{STATUS_LABELS[log.new_value]}</span>
                          </>
                        ) : log.type === 'comment_added' ? (
                          <>
                            added a comment: <span className="italic text-gray-500">"{log.new_value}{log.new_value?.length >= 50 ? '...' : ''}"</span>
                          </>
                        ) : (
                          'performed an action'
                        )}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        {new Date(log.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
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
