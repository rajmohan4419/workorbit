import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProjectStore } from '../../store/projectStore'
import { useTaskStore } from '../../store/taskStore'

import { useState, useEffect } from 'react'

export default function OnboardingChecklist() {
  const projects = useProjectStore((state) => state.projects)
  const [taskCount, setTaskCount] = useState(0)
  const getTaskCount = useTaskStore((state) => state.getTaskCount)

  useEffect(() => {
    getTaskCount().then(setTaskCount)
  }, [getTaskCount])

  const steps = [
    {
      id: 'project',
      label: 'Create your first project',
      completed: projects.length > 0,
      description: 'Start by organizing your work into projects.',
      link: null // Sidebar action
    },
    {
      id: 'task',
      label: 'Add your first task',
      completed: taskCount > 0,
      description: 'Break down your project into actionable tasks.',
      link: projects.length > 0 ? `/project/${projects[0].id}` : null
    },
    {
      id: 'invite',
      label: 'Invite a teammate',
      completed: false, // Simplification
      description: 'Collaboration is better together.',
      link: projects.length > 0 ? `/project/${projects[0].id}` : null
    }
  ]

  const completedCount = steps.filter(s => s.completed).length
  const progress = (completedCount / steps.length) * 100

  if (completedCount === steps.length) return null

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl p-6 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Get Started</h2>
          <p className="text-sm text-gray-500">Complete these steps to set up your workspace.</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-indigo-600 mb-1">{completedCount}/{steps.length} completed</div>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-4 rounded-xl border transition-all ${
              step.completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {step.completed ? (
                <CheckCircle2 size={20} className="text-emerald-500" />
              ) : (
                <Circle size={20} className="text-gray-300" />
              )}
              <span className={`text-sm font-bold ${step.completed ? 'text-emerald-900' : 'text-gray-900'}`}>
                {step.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">{step.description}</p>
            {!step.completed && step.link && (
              <Link
                to={step.link}
                className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all"
              >
                Go to project <ArrowRight size={12} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
