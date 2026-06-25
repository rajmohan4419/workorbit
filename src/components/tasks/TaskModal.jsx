import { useEffect, useState, useRef } from 'react'
import { X, Loader2, MessageSquare, History, Send, Trash2, CheckSquare, Plus, Check, Paperclip, Clock, Play, Square, FileText } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useProjectStore } from '../../store/projectStore'
import { useTaskStore, STATUSES, STATUS_LABELS, PRIORITIES } from '../../store/taskStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { canEditTaskMetadata, canComment } from '../../lib/permissions'

function getInitialForm(task, defaultStatus, currentUserId) {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? 'medium',
    due_date: task?.due_date?.slice(0, 10) ?? '',
    assigned_to: task?.assigned_to ?? currentUserId ?? '',
    sprint_id: task?.sprint_id ?? '',
    story_points: task?.story_points ?? '',
    estimate_hours: task?.estimate_hours ?? '',
    is_blocked: task?.is_blocked ?? false,
  }
}

export default function TaskModal({ task = null, projectId = null, defaultStatus = 'todo', onClose }) {
  const currentUser = useAuthStore((state) => state.user)
  const wsRole = useWorkspaceStore((state) => state.currentUserRole)
  const workspaceMembers = useWorkspaceStore((state) => state.members)
  const sprints = useProjectStore((state) => state.sprints)
  const fetchMembers = useProjectStore((state) => state.fetchMembers)
  const fetchSprints = useProjectStore((state) => state.fetchSprints)
  const createTask = useTaskStore((state) => state.createTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const fetchComments = useTaskStore((state) => state.fetchComments)
  const addComment = useTaskStore((state) => state.addComment)
  const deleteComment = useTaskStore((state) => state.deleteComment)
  const fetchLogs = useTaskStore((state) => state.fetchLogs)
  const comments = useTaskStore((state) => state.comments)
  const logs = useTaskStore((state) => state.logs)

  const subtasks = useTaskStore((state) => state.subtasks)
  const fetchSubtasks = useTaskStore((state) => state.fetchSubtasks)
  const addSubtask = useTaskStore((state) => state.addSubtask)
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask)
  const deleteSubtask = useTaskStore((state) => state.deleteSubtask)

  const taskLabels = useTaskStore((state) => state.labels)
  const projectLabels = useTaskStore((state) => state.projectLabels)
  const fetchTaskLabels = useTaskStore((state) => state.fetchTaskLabels)
  const fetchProjectLabels = useTaskStore((state) => state.fetchProjectLabels)
  const addTaskLabel = useTaskStore((state) => state.addTaskLabel)
  const removeTaskLabel = useTaskStore((state) => state.removeTaskLabel)
  const createLabel = useTaskStore((state) => state.createLabel)

  const attachments = useTaskStore((state) => state.attachments)
  const fetchAttachments = useTaskStore((state) => state.fetchAttachments)
  const uploadAttachment = useTaskStore((state) => state.uploadAttachment)
  const deleteAttachment = useTaskStore((state) => state.deleteAttachment)

  const timeLogs = useTaskStore((state) => state.timeLogs)
  const fetchTimeLogs = useTaskStore((state) => state.fetchTimeLogs)
  const addTimeLog = useTaskStore((state) => state.addTimeLog)

  const isEditing = Boolean(task)
  const canEditMetadata = canEditTaskMetadata(wsRole, currentUser?.id, task?.created_by, task?.assigned_to)
  const canChangeStatus = canEditTaskMetadata(wsRole, currentUser?.id, task?.created_by, task?.assigned_to)
  const canWriteComment = canComment(wsRole)
  const [form, setForm] = useState(() => getInitialForm(task, defaultStatus, currentUser?.id))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [newComment, setNewComment] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#4f46e5')
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [timerActive, setTimerActive] = useState(false)
  const [elapsedTime, setTimerSeconds] = useState(0)
  const fileInputRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const timerActiveRef = useRef(false)
  const elapsedTimeRef = useRef(0)

  useEffect(() => {
    timerActiveRef.current = timerActive
  }, [timerActive])

  useEffect(() => {
    elapsedTimeRef.current = elapsedTime
  }, [elapsedTime])

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [onClose])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      // Use refs to check current state in cleanup to avoid stale closures and excessive triggers
      if (timerActiveRef.current && elapsedTimeRef.current > 0 && task?.id) {
        addTimeLog(task.id, elapsedTimeRef.current, 'Timer session (auto-saved)')
      }
    }
  }, [task?.id, addTimeLog])

  useEffect(() => {
    if (isEditing) {
      fetchComments(task.id)
      fetchLogs(task.id)
      fetchSubtasks(task.id)
      fetchTaskLabels(task.id)
      fetchAttachments(task.id)
      fetchTimeLogs(task.id)
    }
    if (projectId || task?.project_id) {
      const pId = projectId || task.project_id
      fetchMembers(pId)
      fetchProjectLabels(pId)
      fetchSprints(pId)
    }
  }, [isEditing, task?.id, task?.project_id, projectId, fetchComments, fetchLogs, fetchMembers, fetchSubtasks, fetchTaskLabels, fetchProjectLabels, fetchAttachments, fetchTimeLogs, fetchSprints])

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

  const handleAddSubtask = async (e) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return
    setAddingSubtask(true)
    await addSubtask(task.id, newSubtaskTitle.trim())
    setNewSubtaskTitle('')
    setAddingSubtask(false)
  }

  const handleCreateLabel = async (e) => {
    e.preventDefault()
    if (!newLabelName.trim()) return
    setCreatingLabel(true)
    await createLabel(projectId || task.project_id, newLabelName.trim(), newLabelColor)
    setNewLabelName('')
    setCreatingLabel(false)
  }

  const startTimer = () => {
    setTimerActive(true)
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(s => s + 1)
    }, 1000)
  }

  const stopTimer = async () => {
    setTimerActive(false)
    clearInterval(timerIntervalRef.current)
    if (elapsedTime > 0) {
      await addTimeLog(task.id, elapsedTime, 'Timer session')
      setTimerSeconds(0)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await uploadAttachment(task.id, file)
    setUploading(false)
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
      sprint_id: form.sprint_id || null,
      story_points: form.story_points ? parseInt(form.story_points) : null,
      estimate_hours: form.estimate_hours ? parseFloat(form.estimate_hours) : null,
      is_blocked: form.is_blocked,
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

        <div className="flex border-b border-gray-100 px-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex-shrink-0 ${
              activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          {isEditing && (
            <>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
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
                onClick={() => setActiveTab('subtasks')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
                  activeTab === 'subtasks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckSquare size={14} />
                Subtasks
                {subtasks.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                    {subtasks.filter(s => s.is_completed).length}/{subtasks.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
                  activeTab === 'files' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Paperclip size={14} />
                Files
                {attachments.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                    {attachments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('time')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
                  activeTab === 'time' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock size={14} />
                Time
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
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

            <div className="lg:col-span-1">
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Assignee</label>
              <select
                value={form.assigned_to}
                disabled={isEditing && !canEditMetadata}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Unassigned</option>
                {workspaceMembers.map((member) => (
                  <option key={member.profiles.id} value={member.profiles.id}>
                    {member.profiles.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Sprint</label>
              <select
                value={form.sprint_id}
                disabled={isEditing && !canEditMetadata}
                onChange={(e) => handleChange('sprint_id', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">No Sprint</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name} ({sprint.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Story Points</label>
              <input
                type="number"
                value={form.story_points}
                disabled={isEditing && !canEditMetadata}
                onChange={(e) => handleChange('story_points', e.target.value)}
                placeholder="e.g. 5"
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Estimate Hours</label>
              <input
                type="number"
                step="0.5"
                value={form.estimate_hours}
                disabled={isEditing && !canEditMetadata}
                onChange={(e) => handleChange('estimate_hours', e.target.value)}
                placeholder="e.g. 8"
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div className="lg:col-span-1 flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.is_blocked}
                  disabled={isEditing && !canEditMetadata}
                  onChange={(e) => handleChange('is_blocked', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-gray-700 group-hover:text-red-600 transition-colors">Blocked?</span>
              </label>
            </div>
          </div>

              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}

              <div>
                <label className="text-xs text-gray-400 font-medium block mb-2">Labels</label>
                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                  {taskLabels.map(label => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
                      style={{ backgroundColor: `${label.color}15`, color: label.color }}
                    >
                      {label.name}
                      {canEditMetadata && (
                        <button
                          onClick={() => removeTaskLabel(task.id, label.id)}
                          className="hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </span>
                  ))}
                  {canEditMetadata && (
                    <div className="relative">
                      <button
                        onClick={() => setShowLabelPicker(!showLabelPicker)}
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      >
                        <Plus size={14} />
                      </button>

                      {showLabelPicker && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-10 p-2 animate-in fade-in slide-in-from-top-1">
                          <div className="max-h-48 overflow-y-auto mb-2 space-y-0.5">
                            {projectLabels.map(label => {
                              const isAttached = taskLabels.some(tl => tl.id === label.id)
                              return (
                                <button
                                  key={label.id}
                                  onClick={() => {
                                    if (isAttached) removeTaskLabel(task.id, label.id)
                                    else addTaskLabel(task.id, label.id)
                                  }}
                                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 text-xs text-gray-600 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                                    {label.name}
                                  </div>
                                  {isAttached && <Check size={12} className="text-indigo-600" />}
                                </button>
                              )
                            })}
                          </div>
                          <div className="border-t border-gray-100 pt-2 px-1">
                            <form onSubmit={handleCreateLabel} className="space-y-2">
                              <input
                                value={newLabelName}
                                onChange={e => setNewLabelName(e.target.value)}
                                placeholder="New label name"
                                className="w-full text-[11px] px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                  {['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'].map(c => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setNewLabelColor(c)}
                                      className={`w-3 h-3 rounded-full transition-transform ${newLabelColor === c ? 'scale-125 ring-1 ring-offset-1 ring-indigo-500' : ''}`}
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </div>
                                <button
                                  disabled={creatingLabel || !newLabelName.trim()}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                >
                                  Create
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

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

          {isEditing && activeTab === 'subtasks' && (
            <div className="space-y-6">
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {subtasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckSquare size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No subtasks yet.</p>
                  </div>
                ) : (
                  subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center justify-between gap-3 group px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleSubtask(subtask.id, !subtask.is_completed)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            subtask.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-indigo-500'
                          }`}
                        >
                          {subtask.is_completed && <Check size={12} />}
                        </button>
                        <span className={`text-sm ${subtask.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {subtask.title}
                        </span>
                      </div>
                      {canEditMetadata && (
                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {canEditMetadata && (
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={addingSubtask || !newSubtaskTitle.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          )}

          {isEditing && activeTab === 'files' && (
            <div className="space-y-6">
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {attachments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Paperclip size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No attachments yet.</p>
                  </div>
                ) : (
                  attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-3 group px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-[10px] text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteAttachment(file.id, file.file_path)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canEditMetadata && (
                <div className="flex justify-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
                  >
                    {uploading ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
                    <span className="text-xs font-bold uppercase tracking-wider">Upload File</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {isEditing && activeTab === 'time' && (
            <div className="space-y-8">
              <div className="bg-gray-900 rounded-2xl p-8 text-center text-white shadow-xl">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Timer</div>
                <div className="text-5xl font-mono font-light tracking-tight mb-8">
                  {new Date(elapsedTime * 1000).toISOString().substr(11, 8)}
                </div>
                <div className="flex justify-center gap-4">
                  {timerActive ? (
                    <button
                      onClick={stopTimer}
                      className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                      <Square size={24} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      onClick={startTimer}
                      className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                      <Play size={24} fill="currentColor" className="ml-1" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time History</h4>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
                  {timeLogs.length === 0 ? (
                    <div className="text-center py-6 text-gray-300 text-sm">No time logged yet.</div>
                  ) : (
                    timeLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-sm font-bold text-gray-900">
                            {Math.floor(log.duration_seconds / 3600)}h {Math.floor((log.duration_seconds % 3600) / 60)}m
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {isEditing && activeTab === 'activity' && (
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
