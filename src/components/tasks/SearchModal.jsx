import { useState, useEffect, useMemo } from 'react'
import { Search, X, Folder, CheckSquare, ArrowRight, Loader2, Plus, LayoutGrid, UserPlus, User, MessageSquare, Sparkles, FileText } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useTaskStore } from '../../store/taskStore'
import { useProjectStore } from '../../store/projectStore'
import { taskService } from '../../lib/services/taskService'
import { parseCommand } from '../../lib/ai/commandParser'
import MeetingNotesModal from './MeetingNotesModal'

const COMMANDS = [
  { id: 'create-task', title: 'Create Task', icon: Plus, shortcut: 'T' },
  { id: 'meeting-notes', title: 'Paste Meeting Notes', icon: FileText, shortcut: 'N' },
  { id: 'all-tasks', title: 'My Tasks', icon: CheckSquare, shortcut: 'M' },
  { id: 'switch-workspace', title: 'Switch Workspace', icon: LayoutGrid, shortcut: 'W' },
  { id: 'invite-member', title: 'Invite Member', icon: UserPlus, shortcut: 'I' },
]

export default function SearchModal({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [showMeetingNotes, setShowMeetingNotes] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState({ projects: [], tasks: [], members: [], comments: [] })
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace)
  const activeProject = useProjectStore((state) => state.activeProject)

  useEffect(() => {
    if (!query.trim()) {
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await taskService.searchAll(query)
        setResults(data)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return COMMANDS
    return COMMANDS.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
  }, [query])

  const aiCommand = useMemo(() => {
    if (!query.trim() || query.length < 5) return null
    const cmd = parseCommand(query)
    if (cmd.type !== 'UNKNOWN') return cmd
    return null
  }, [query])

  const flatResults = useMemo(() => {
    const list = [
      ...filteredCommands.map(c => ({ ...c, type: 'command' })),
      ...results.projects.map(p => ({ ...p, type: 'project' })),
      ...results.tasks.map(t => ({ ...t, type: 'task' })),
      ...results.members.map(m => ({ ...m, type: 'member' })),
      ...results.comments.map(c => ({ ...c, type: 'comment' }))
    ]
    if (aiCommand) {
      list.unshift({ ...aiCommand, id: 'ai-command', type: 'ai' })
    }
    return list
  }, [filteredCommands, results, aiCommand])


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

        if (item.type === 'ai') {
          useTaskStore.getState().executeCommand(item)
          onClose()
          return
        }

        if (item.type === 'command') {
          if (item.id === 'create-task') {
            // Logic to open task modal could go here, for now just close
            onClose()
          } else if (item.id === 'meeting-notes') {
            setShowMeetingNotes(true)
            return
          } else if (item.id === 'all-tasks') {
            navigate('/my-tasks')
            onClose()
          } else if (item.id === 'switch-workspace') {
            navigate('/workspaces')
            onClose()
          } else if (item.id === 'invite-member') {
            navigate('/settings/members')
            onClose()
          }
          return
        }

        if (item.type === 'member') {
          // No specific member page yet, maybe profile?
          return
        }

        const workspaceSlug = item.type === 'project'
          ? item.workspaces?.slug || activeWorkspace?.slug
          : item.type === 'task'
            ? item.projects?.workspaces?.slug || activeWorkspace?.slug
            : item.tasks?.projects?.workspaces?.slug || activeWorkspace?.slug

        if (workspaceSlug) {
          const path = item.type === 'project'
            ? `/workspaces/${workspaceSlug}/projects/${item.id}`
            : item.type === 'task'
              ? `/workspaces/${workspaceSlug}/projects/${item.project_id}`
              : `/workspaces/${workspaceSlug}/projects/${item.tasks?.project_id}`
          navigate(path)
        } else {
          const path = item.type === 'project'
            ? `/projects/${item.id}`
            : item.type === 'task'
              ? `/projects/${item.project_id}`
              : `/projects/${item.tasks?.project_id}`
          navigate(path)
        }
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, flatResults, selectedIndex, navigate, activeWorkspace?.slug])

  const hasResults = results.projects.length > 0 || results.tasks.length > 0 || results.members.length > 0 || results.comments.length > 0

  return (
    <>
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
            onChange={e => {
              const val = e.target.value
              setQuery(val)
              setSelectedIndex(0)
              if (!val.trim()) {
                setResults({ projects: [], tasks: [] })
              }
            }}
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
          {!query.trim() && (
            <div className="mb-4">
               <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</h3>
               <div className="space-y-1">
                  {COMMANDS.map((cmd, idx) => {
                    const isSelected = selectedIndex === idx
                    const Icon = cmd.icon
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                           if (cmd.id === 'switch-workspace') navigate('/workspaces')
                           if (cmd.id === 'all-tasks') navigate('/my-tasks')
                           if (cmd.id === 'invite-member') navigate('/settings/members')
                           onClose()
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl group transition-colors ${
                          isSelected ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                            <Icon size={16} />
                          </div>
                          <p className="text-sm font-medium text-gray-900">{cmd.title}</p>
                        </div>
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">{cmd.shortcut}</span>
                      </button>
                    )
                  })}
               </div>
            </div>
          )}

          {query.trim() && !hasResults && filteredCommands.length === 0 && !aiCommand ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {aiCommand && (
                <div>
                  <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Quick Actions</h3>
                  <button
                    onClick={() => {
                      useTaskStore.getState().executeCommand(aiCommand)
                      onClose()
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl group transition-colors border border-indigo-100 ${
                      selectedIndex === 0 ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-indigo-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                        <Sparkles size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">
                          {aiCommand.type === 'CREATE_TASK_RICH' ? `Create task: ${aiCommand.payload.title}` :
                           aiCommand.type === 'CREATE_PROJECT' ? `Create project: ${aiCommand.payload.name}` :
                           aiCommand.type === 'PLAN_SPRINT' ? `Plan sprint: ${aiCommand.payload.name}` : 'Execute AI Command'}
                        </p>
                        <p className="text-[10px] text-indigo-500 font-medium">Press Enter to execute</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-indigo-400" />
                  </button>
                </div>
              )}

              {filteredCommands.length > 0 && query.trim() && (
                <div>
                  <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Actions</h3>
                  <div className="space-y-1">
                    {filteredCommands.map((cmd, idx) => {
                       const isSelected = selectedIndex === idx
                       const Icon = cmd.icon
                       return (
                        <button
                          key={cmd.id}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl group transition-colors ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                              <Icon size={16} />
                            </div>
                            <p className="text-sm font-medium text-gray-900">{cmd.title}</p>
                          </div>
                        </button>
                       )
                    })}
                  </div>
                </div>
              )}

              {results.members.length > 0 && (
                <div>
                  <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Members</h3>
                  <div className="space-y-1">
                    {results.members.map((member, idx) => {
                      const isSelected = selectedIndex === (idx + filteredCommands.length + results.projects.length + results.tasks.length)
                      return (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl group transition-colors cursor-default ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {member.avatar_path ? (
                              <img src={member.avatar_path} className="w-8 h-8 rounded-lg object-cover" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                <User size={16} />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {results.comments.length > 0 && (
                <div>
                  <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comments</h3>
                  <div className="space-y-1">
                    {results.comments.map((comment, idx) => {
                      const isSelected = selectedIndex === (idx + filteredCommands.length + results.projects.length + results.tasks.length + results.members.length)
                      const wsSlug = comment.tasks?.projects?.workspaces?.slug || activeWorkspace?.slug
                      return (
                        <Link
                          key={comment.id}
                          to={`/workspaces/${wsSlug}/projects/${comment.tasks?.project_id}`}
                          onClick={onClose}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl group transition-colors ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                              <MessageSquare size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 line-clamp-1">{comment.content}</p>
                              <p className="text-xs text-gray-400">
                                in <span className="font-medium text-indigo-400">{comment.tasks?.title}</span>
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

              {results.projects.length > 0 && (
                <div>
                  <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Projects</h3>
                  <div className="space-y-1">
                    {results.projects.map((project, idx) => {
                      const isSelected = selectedIndex === (idx + filteredCommands.length)
                      const wsSlug = project.workspaces?.slug || activeWorkspace?.slug
                      return (
                        <Link
                          key={project.id}
                          to={`/workspaces/${wsSlug}/projects/${project.id}`}
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
                      const isSelected = selectedIndex === (idx + filteredCommands.length + results.projects.length)
                      return (
                        <Link
                          key={task.id}
                          to={`/workspaces/${task.projects?.workspaces?.slug || activeWorkspace?.slug}/projects/${task.project_id}`}
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

    {showMeetingNotes && (
      <MeetingNotesModal
        projectId={activeProject?.id || activeWorkspace?.projects?.[0]?.id}
        onClose={() => {
          setShowMeetingNotes(false)
          onClose()
        }}
      />
    )}
    </>
  )
}
