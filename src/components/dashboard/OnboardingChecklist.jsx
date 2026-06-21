import { CheckCircle2, Circle, ArrowRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProjectStore } from '../../store/projectStore'
import { useTaskStore } from '../../store/taskStore'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'

import { useState, useEffect } from 'react'

export default function OnboardingChecklist() {
  const projects = useProjectStore((state) => state.projects)
  const profile = useAuthStore((state) => state.profile)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const [taskCount, setTaskCount] = useState(0)
  const [hasTeammates, setHasTeammates] = useState(false)
  const getTaskCount = useTaskStore((state) => state.getTaskCount)

  useEffect(() => {
    getTaskCount().then(setTaskCount)

    const checkTeammates = async () => {
      const [invites, members] = await Promise.all([
        supabase.from('project_invites').select('id', { count: 'exact', head: true }),
        supabase.from('project_members').select('id', { count: 'exact', head: true })
      ])
      setHasTeammates((invites.count || 0) > 0 || (members.count || 0) > 0)
    }
    checkTeammates()
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
      completed: hasTeammates,
      description: 'Collaboration is better together.',
      link: projects.length > 0 ? `/project/${projects[0].id}` : null
    }
  ]

  const completedCount = steps.filter(s => s.completed).length
  const progress = (completedCount / steps.length) * 100

  const handleDismiss = () => {
    updateProfile({ onboarding_completed: true })
  }

  if (profile?.onboarding_completed || completedCount === steps.length) return null

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl p-6 mb-8 shadow-sm relative group">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        title="Dismiss onboarding"
      >
        <X size={16} />
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Get Started</h2>
          <p className="text-sm text-gray-500">Complete these steps to set up your workspace.</p>
        </div>
        <div className="text-right mr-8">
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
