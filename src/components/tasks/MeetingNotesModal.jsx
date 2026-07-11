import { useState } from 'react'
import { X, FileText, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { useTaskStore } from '../../store/taskStore'

export default function MeetingNotesModal({ projectId, onClose }) {
  const [notes, setNotes] = useState('')
  const [parsing, setParsing] = useState(false)
  const [extractedTasks, setExtractedTasks] = useState([])
  const executeCommand = useTaskStore(state => state.executeCommand)

  const handleParse = () => {
    setParsing(true)
    // Simulated AI parsing logic
    setTimeout(() => {
      const lines = notes.split('\n')
      const tasks = []
      lines.forEach(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith('- [ ]') || trimmed.startsWith('TODO:') || trimmed.startsWith('Action Item:')) {
          const title = trimmed.replace(/^- \[ \]|TODO:|Action Item:/i, '').trim()
          if (title) {
            tasks.push({
              title,
              priority: title.toLowerCase().includes('urgent') || title.toLowerCase().includes('important') ? 'high' : 'medium'
            })
          }
        }
      })
      setExtractedTasks(tasks)
      setParsing(false)
    }, 1500)
  }

  const handleCreateTasks = async () => {
    for (const task of extractedTasks) {
      await executeCommand({
        type: 'CREATE_TASK_RICH',
        payload: task
      }, { projectId })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Meeting Notes to Tasks</h2>
              <p className="text-xs text-gray-400 font-medium">AI-powered action item extraction</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {extractedTasks.length === 0 ? (
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">Paste your meeting notes or transcript</label>
              <textarea
                className="w-full h-64 p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed"
                placeholder="Example:&#10;- [ ] Fix the login bug by Friday&#10;TODO: Update landing page copy&#10;Action Item: Schedule sync with design team"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                disabled={!notes.trim() || parsing}
                onClick={handleParse}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
              >
                {parsing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing notes...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Extract Action Items
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Extracted Action Items ({extractedTasks.length})</h3>
                <button
                  onClick={() => setExtractedTasks([])}
                  className="text-xs text-indigo-600 font-bold hover:underline"
                >
                  Start Over
                </button>
              </div>
              <div className="space-y-2">
                {extractedTasks.map((task, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <span className="text-sm font-medium text-gray-700">{task.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                      task.priority === 'high' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleCreateTasks}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                Create All Tasks
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
