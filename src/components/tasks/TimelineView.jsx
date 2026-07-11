import { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import { calculateCriticalPath } from '../../lib/utils/criticalPath'
import { useTaskStore } from '../../store/taskStore'

export default function TimelineView({ tasks }) {
  const dependencies = useTaskStore(state => state.dependencies)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const days = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))
  }, [currentMonth])

  const { criticalPathIds } = useMemo(() => {
    return calculateCriticalPath(tasks, dependencies)
  }, [tasks, dependencies])

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col h-full shadow-sm">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">{monthName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="inline-block min-w-full border-separate border-spacing-0">
          <div className="flex border-b border-gray-50">
            <div className="w-48 sticky left-0 z-10 bg-white border-r border-gray-50 p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasks</div>
            <div className="flex">
              {daysInMonth.map(day => (
                <div key={day.toISOString()} className="w-10 flex-shrink-0 text-center py-4 border-r border-gray-50 last:border-0">
                  <div className="text-[10px] font-bold text-gray-400 uppercase">{day.toLocaleString('default', { weekday: 'narrow' })}</div>
                  <div className={`text-xs mt-1 font-medium ${day.toDateString() === new Date().toDateString() ? 'text-indigo-600 font-bold' : 'text-gray-600'}`}>
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {tasks.filter(t => t.due_date).map(task => {
              const dueDate = new Date(task.due_date)
              const isThisMonth = dueDate.getMonth() === currentMonth.getMonth() && dueDate.getFullYear() === currentMonth.getFullYear()
              const isCritical = criticalPathIds.includes(task.id)

              return (
                <div key={task.id} className="flex group hover:bg-gray-50/50 transition-colors">
                  <div className="w-48 sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-50 p-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-medium truncate ${isCritical ? 'text-orange-600' : 'text-gray-700'}`}>{task.title}</p>
                      {isCritical && <AlertTriangle size={12} className="text-orange-500 flex-shrink-0" title="Critical Path" />}
                    </div>
                  </div>
                  <div className="flex relative h-12 items-center">
                    {daysInMonth.map(day => (
                      <div key={day.toISOString()} className="w-10 h-full flex-shrink-0 border-r border-gray-50 last:border-0" />
                    ))}
                    {isThisMonth && (
                      <div
                        className={`absolute h-6 rounded-full flex items-center px-2 shadow-sm border ${
                          isCritical
                            ? 'bg-orange-500/10 border-orange-200 animate-pulse'
                            : 'bg-indigo-500/10 border-indigo-200'
                        }`}
                        style={{
                          left: `${(dueDate.getDate() - 1) * 40 + 4}px`,
                          width: '32px' // Simplified: just showing the point for now
                        }}
                      >
                        <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-orange-600' : 'bg-indigo-600'}`} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {tasks.length > 0 && tasks.filter(t => t.due_date).length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
          <Clock size={32} className="mb-2 opacity-20" />
          <p className="text-sm font-medium">No tasks with due dates to show on timeline.</p>
          <p className="text-[10px] mt-1">Only tasks with due dates are visible here.</p>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
          <Calendar size={32} className="mb-2 opacity-20" />
          <p className="text-sm font-medium">No tasks in this project yet.</p>
        </div>
      )}
    </div>
  )
}
