import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useTaskStore, STATUSES, STATUS_LABELS } from '../../store/taskStore'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'

const columnColors = {
  todo: 'bg-gray-50 border-gray-100',
  in_progress: 'bg-blue-50 border-blue-100',
  in_review: 'bg-amber-50 border-amber-100',
  done: 'bg-green-50 border-green-100',
}

const dotColors = {
  todo: 'bg-gray-300',
  in_progress: 'bg-blue-400',
  in_review: 'bg-amber-400',
  done: 'bg-green-400',
}

function AddTaskInline({ projectId, status, onDone }) {
  const { createTask } = useTaskStore()
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await createTask({ title: title.trim(), status, project_id: projectId, priority: 'medium' })
    setSaving(false)
    setTitle('')
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task name"
        className="w-full text-sm border border-indigo-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        onKeyDown={(e) => e.key === 'Escape' && onDone()}
      />
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={11} className="animate-spin" />}
          Add task
        </button>
        <button type="button" onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function KanbanBoard({ projectId }) {
  const { tasks, moveTask } = useTaskStore()
  const [addingTo, setAddingTo] = useState(null)
  const [openTask, setOpenTask] = useState(null)
  const [dragging, setDragging] = useState(null)

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s)
    return acc
  }, {})

  const handleDragStart = (e, task) => {
    setDragging(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, status) => {
    e.preventDefault()
    if (dragging && dragging.status !== status) {
      await moveTask(dragging.id, status)
    }
    setDragging(null)
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {STATUSES.map((status) => (
          <div
            key={status}
            className={`flex-shrink-0 w-72 rounded-2xl border ${columnColors[status]} flex flex-col`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
                <span className="text-sm font-medium text-gray-700">{STATUS_LABELS[status]}</span>
                <span className="text-xs text-gray-400 bg-white border border-gray-100 px-1.5 py-0.5 rounded-full">
                  {tasksByStatus[status].length}
                </span>
              </div>
              <button
                onClick={() => setAddingTo(status)}
                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {tasksByStatus[status].map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  className={`transition-opacity ${dragging?.id === task.id ? 'opacity-40' : ''}`}
                >
                  <TaskCard task={task} onOpen={setOpenTask} />
                </div>
              ))}

              {addingTo === status && (
                <AddTaskInline
                  projectId={projectId}
                  status={status}
                  onDone={() => setAddingTo(null)}
                />
              )}

              {tasksByStatus[status].length === 0 && addingTo !== status && (
                <button
                  onClick={() => setAddingTo(status)}
                  className="w-full py-6 text-xs text-gray-300 hover:text-indigo-400 border-2 border-dashed border-gray-100 hover:border-indigo-200 rounded-xl transition-colors"
                >
                  Add a task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {openTask && (
        <TaskModal task={openTask} onClose={() => setOpenTask(null)} />
      )}
    </>
  )
}
