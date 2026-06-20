import { useState, useMemo } from 'react'
import { Calendar, ArrowUpDown } from 'lucide-react'
import { STATUS_LABELS, PRIORITIES } from '../../store/taskStore'

export default function TaskTable({ tasks, onTaskClick }) {
  const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'asc' })
  const [filters, setFilters] = useState({ status: '', priority: '' })

  const sortedAndFilteredTasks = useMemo(() => {
    let result = [...tasks]

    if (filters.status) {
      result = result.filter(t => t.status === filters.status)
    }
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority)
    }

    result.sort((a, b) => {
      if (!a[sortConfig.key]) return 1
      if (!b[sortConfig.key]) return -1

      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })

    return result
  }, [tasks, sortConfig, filters])

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-amber-600 bg-amber-50'
      case 'low': return 'text-emerald-600 bg-emerald-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="px-6 py-4">
                <button
                  onClick={() => requestSort('title')}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  Task Name
                  <ArrowUpDown size={12} className={sortConfig.key === 'title' ? 'text-indigo-500' : ''} />
                </button>
              </th>
              <th className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="text-[10px] bg-transparent border-none focus:ring-0 text-gray-400 cursor-pointer"
                  >
                    <option value="">All</option>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </th>
              <th className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</span>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="text-[10px] bg-transparent border-none focus:ring-0 text-gray-400 cursor-pointer"
                  >
                    <option value="">All</option>
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </th>
              <th className="px-6 py-4">
                <button
                  onClick={() => requestSort('due_date')}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  Due Date
                  <ArrowUpDown size={12} className={sortConfig.key === 'due_date' ? 'text-indigo-500' : ''} />
                </button>
              </th>
              <th className="px-6 py-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assignee</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedAndFilteredTasks.map((task) => (
              <tr
                key={task.id}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                onClick={() => onTaskClick(task)}
              >
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{task.title}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.status === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} className="text-gray-300" />
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No date'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 overflow-hidden">
                      {task.profiles?.avatar_path ? (
                        <img src={task.profiles.avatar_path} alt="" className="w-full h-full object-cover" />
                      ) : (
                        task.profiles?.full_name?.slice(0, 2).toUpperCase() || 'U'
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{task.profiles?.full_name || 'Unassigned'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedAndFilteredTasks.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-400 font-medium">No tasks found matching your filters.</p>
        </div>
      )}
    </div>
  )
}
