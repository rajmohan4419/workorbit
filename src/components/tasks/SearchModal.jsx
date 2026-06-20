import { useState, useEffect, useMemo } from 'react'
import { Search, X, Folder, CheckSquare, ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTaskStore } from '../../store/taskStore'
import { useProjectStore } from '../../store/projectStore'

export default function SearchModal({ onClose }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchResults = useTaskStore((state) => state.searchResults)
  const fetchGlobalTasks = useTaskStore((state) => state.fetchGlobalTasks)
  const projects = useProjectStore((state) => state.projects)

  useEffect(() => {
    const initSearch = async () => {
      setSearching(true)
      await fetchGlobalTasks()
      setSearching(false)
    }
    initSearch()
  }, [fetchGlobalTasks])

  const results = useMemo(() => {
    if (!query.trim()) return { projects: [], tasks: [] }

    const q = query.toLowerCase()

    const filteredProjects = projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ).slice(0, 5)

    const filteredTasks = searchResults.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    ).slice(0, 10)

    return { projects: filteredProjects, tasks: filteredTasks }
  }, [query, projects, searchResults])

  const flatResults = useMemo(() => {
    return [
      ...results.projects.map(p => ({ ...p, type: 'project' })),
      ...results.tasks.map(t => ({ ...t, type: 'task' }))
    ]
  }, [results])

  // No-op to reset index when query changes
  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setSelectedIndex(0)
    setPrevQuery(query)
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % Math.max(1, flatResults.length))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + flatResults.length) % Math.max(1, flatResults.length))
      }
      if (e.key === 'Enter' && flatResults[selectedIndex]) {
        const item = flatResults[selectedIndex]
        window.location.href = item.type === 'project' ? `/project/${item.id}` : `/project/${item.project_id}`
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, flatResults, selectedIndex])

  const hasResults = results.projects.length > 0 || results.tasks.length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-4 border-b border-gray-100">
          <Search className="text-gray-400 mr-3" size={20} />
          <input
            autoFocus
            className="flex-1 text-gray-900 placeholder-gray-400 outline-none text-lg"
            placeholder="Search projects and tasks..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {searching ? (
            <Loader2 className="animate-spin text-gray-300" size={18} />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">ESC</span>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="py-12 text-center">
              <Search size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Search for anything across ProjectFlow</p>
            </div>
          ) : !hasResults ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {results.projects.length > 0 && (
                <div>
                  <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Projects</h3>
                  <div className="space-y-1">
                    {results.projects.map((project, idx) => {
                      const isSelected = selectedIndex === idx
                      return (
                        <Link
                          key={project.id}
                          to={`/project/${project.id}`}
                          onClick={onClose}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl group transition-colors ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                              <Folder size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{project.name}</p>
                              {project.description && (
                                <p className="text-xs text-gray-400 line-clamp-1">{project.description}</p>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={14} className={`text-gray-300 transition-all ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {results.tasks.length > 0 && (
                <div>
                  <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tasks</h3>
                  <div className="space-y-1">
                    {results.tasks.map((task, idx) => {
                      const isSelected = selectedIndex === (idx + results.projects.length)
                      return (
                        <Link
                          key={task.id}
                          to={`/project/${task.project_id}`}
                          onClick={onClose}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl group transition-colors ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <CheckSquare size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{task.title}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <span className="font-medium text-indigo-400">{task.projects?.name}</span>
                                <span>•</span>
                                <span>{task.status.replace('_', ' ')}</span>
                              </p>
                            </div>
                          </div>
                          <ArrowRight size={14} className={`text-gray-300 transition-all ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">↵</span>
            <span className="text-[10px] text-gray-500 font-medium">to select</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">↑↓</span>
            <span className="text-[10px] text-gray-500 font-medium">to navigate</span>
          </div>
        </div>
      </div>
    </div>
  )
}
