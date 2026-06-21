import { useState } from 'react'
import { X, Sparkles, Check, Loader2, RotateCcw, Plus } from 'lucide-react'
import { useTaskStore } from '../../store/taskStore'

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-emerald-50 text-emerald-700',
}

export default function AITaskModal({ projectId, onClose }) {
  const createTask = useTaskStore((state) => state.createTask)

  const [phase, setPhase] = useState('input') // input | thinking | results | creating | done
  const [goal, setGoal] = useState('')
  const [autoPriority, setAutoPriority] = useState(true)
  const [addDescriptions, setAddDescriptions] = useState(true)
  const [generatedTasks, setGeneratedTasks] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [error, setError] = useState('')
  const [createdCount, setCreatedCount] = useState(0)

  const handleGenerate = async () => {
    if (!goal.trim()) return
    setPhase('thinking')
    setError('')

    try {
      const systemPrompt = `You are a senior software project manager. Break down a goal into concrete, 
actionable development tasks. Always respond with valid JSON only — no markdown, no explanation, just the JSON array.`

      const userPrompt = `Break this goal into tasks: "${goal}"

Return a JSON array of tasks. Each task must have:
- title: string (concise action-oriented title, max 80 chars)
- description: ${addDescriptions ? 'string (1-2 sentences explaining what to do and why)' : 'null'}
- priority: ${autoPriority ? '"high", "medium", or "low" based on logical dependency order' : '"medium"'}
- status: "todo"

Rules:
- 5 to 9 tasks maximum
- Order them logically (foundational tasks first)
- Each task should be completable in 1-3 days
- Titles should start with a verb (Build, Create, Set up, Implement, Write, Configure, etc.)
- No duplicates, no vague tasks

Respond with ONLY a JSON array, nothing else.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })

      const data = await response.json()
      const rawText = data.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')

      const clean = rawText.replace(/```json|```/g, '').trim()
      const tasks = JSON.parse(clean)

      if (!Array.isArray(tasks)) throw new Error('Unexpected response format')

      setGeneratedTasks(tasks)
      setSelected(new Set(tasks.map((_, i) => i)))
      setPhase('results')
    } catch (err) {
      setError('Something went wrong generating tasks. Please try again.')
      setPhase('input')
    }
  }

  const toggleTask = (i) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === generatedTasks.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(generatedTasks.map((_, i) => i)))
    }
  }

  const handleCreate = async () => {
    if (!selected.size) return
    setPhase('creating')

    const toCreate = generatedTasks.filter((_, i) => selected.has(i))
    let count = 0

    for (const task of toCreate) {
      const { error } = await createTask({
        title: task.title,
        description: task.description || null,
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        due_date: null,
        project_id: projectId,
        assigned_to: null,
      })
      if (!error) count++
    }

    setCreatedCount(count)
    setPhase('done')
  }

  const handleReset = () => {
    setPhase('input')
    setGoal('')
    setGeneratedTasks([])
    setSelected(new Set())
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900">Break down a goal into tasks</p>
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Sparkles size={10} />
                AI
              </span>
            </div>
            <p className="text-xs text-gray-400">Describe what you want to build — AI generates a ready-to-use task list.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* INPUT PHASE */}
          {phase === 'input' && (
            <div className="space-y-4">
              <textarea
                autoFocus
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
                }}
                placeholder="e.g. Build a Stripe payment integration with webhook handling and a revenue dashboard"
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder-gray-300 text-gray-800"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAutoPriority((p) => !p)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                    autoPriority
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {autoPriority && <Check size={11} />}
                  Auto-assign priority
                </button>
                <button
                  onClick={() => setAddDescriptions((p) => !p)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                    addDescriptions
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {addDescriptions && <Check size={11} />}
                  Add descriptions
                </button>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={!goal.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={15} />
                Generate tasks
                <span className="text-indigo-300 text-xs font-normal ml-1">⌘↵</span>
              </button>
            </div>
          )}

          {/* THINKING PHASE */}
          {phase === 'thinking' && (
            <div className="flex items-center gap-3 py-8 text-gray-400 text-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              Breaking your goal into tasks…
            </div>
          )}

          {/* RESULTS PHASE */}
          {(phase === 'results' || phase === 'creating') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Generated tasks
                </p>
                <button
                  onClick={toggleAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  {selected.size === generatedTasks.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {generatedTasks.map((task, i) => {
                  const isSelected = selected.has(i)
                  return (
                    <button
                      key={i}
                      onClick={() => toggleTask(i)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-200 bg-indigo-50/40'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check size={10} color="white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 leading-snug">{task.title}</p>
                        {task.description && (
                          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                            To do
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* CREATING PHASE */}
          {phase === 'creating' && (
            <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin text-indigo-500" />
              Creating {selected.size} tasks…
            </div>
          )}

          {/* DONE PHASE */}
          {phase === 'done' && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{createdCount} tasks created</p>
              <p className="text-xs text-gray-400">They're now on your Kanban board, ready to go.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        {(phase === 'results' || phase === 'creating') && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              <span className="font-medium text-gray-700">{selected.size}</span> of {generatedTasks.length} tasks selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <RotateCcw size={12} />
                Start over
              </button>
              <button
                onClick={handleCreate}
                disabled={!selected.size || phase === 'creating'}
                className="flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phase === 'creating' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={12} />
                )}
                Create tasks
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="text-sm font-medium bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View board
            </button>
          </div>
        )}

      </div>
    </div>
  )
}