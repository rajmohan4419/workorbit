import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore } from '../store/authStore'

export default function DashboardPage() {
  const { projects, fetchProjects, loading } = useProjectStore()
  const { user } = useAuthStore()

  useEffect(() => { fetchProjects() }, [])

  const firstName = user?.email?.split('@')[0] || 'there'

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Good to see you, {firstName}</h1>
        <p className="text-gray-400 text-sm mt-1">Here's what's happening across your projects.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Projects', value: projects.length, icon: FolderOpen, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Active', value: projects.length, icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Completed', value: 0, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
          { label: 'Overdue', value: 0, icon: AlertCircle, color: 'text-red-500 bg-red-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon size={16} />
            </div>
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Your projects</h2>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <FolderOpen size={40} className="mx-auto mb-3" />
            <p className="text-sm">No projects yet. Create one from the sidebar.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="group bg-white border border-gray-100 hover:border-indigo-200 rounded-xl p-5 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <ArrowRight size={15} className="text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-xs text-gray-400">
                    Created {new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
