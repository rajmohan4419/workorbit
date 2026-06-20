import { useState, useEffect } from 'react'
import { X, Calendar, Flag, Loader2 } from 'lucide-react'
import { useTaskStore, STATUSES, STATUS_LABELS, PRIORITIES } from '../../store/taskStore'

export default function TaskModal({ task, onClose }) {
  const { updateTask, moveTask } = useTaskStore()
  const [form, setForm] = useState({ ...task })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    await updateTask(task.id, {
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            {STATUS_LABELS[form.status]}
          </span>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <input
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full text-lg font-semibold text-gray-900 focus:outline-none border-b border-transparent focus:border-indigo-200 pb-1 transition-colors"
            placeholder="Task title"
          />

          <textarea
            value={form.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Add a description..."
            rows={3}
            className="w-full text-sm text-gray-600 focus:outline-none resize-none placeholder-gray-300"
          />

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Due date</label>
              <input
                type="date"
                value={form.due_date?.slice(0, 10) || ''}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
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
            disabled={saving}
            className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
