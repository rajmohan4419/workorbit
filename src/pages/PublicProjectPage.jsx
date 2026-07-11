import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckCircle2, Circle, Clock, Globe, ArrowRight } from 'lucide-react'

export default function PublicProjectPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPublicData() {
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .single()

      if (proj) {
        setProject(proj)
        const { data: t } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', id)
          .order('due_date', { ascending: true, nullsFirst: false })
        setTasks(t || [])
      }
      setLoading(false)
    }
    fetchPublicData()
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading roadmap...</div>
  if (!project) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 font-bold">This roadmap is private or does not exist.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">O</div>
            <span className="font-bold text-gray-900 tracking-tight">OrbitBoard <span className="text-indigo-600">Roadmap</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <Globe size={12} />
            Public View
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{project.name}</h1>
          <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">{project.description}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {['todo', 'in_progress', 'done'].map(status => (
            <div key={status} className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                {status === 'todo' && <Circle size={14} />}
                {status === 'in_progress' && <Clock size={14} className="text-indigo-500" />}
                {status === 'done' && <CheckCircle2 size={14} className="text-emerald-500" />}
                {status.replace('_', ' ')}
              </h3>
              <div className="space-y-3">
                {tasks.filter(t => t.status === status).map(task => (
                  <div key={task.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                    {task.due_date && (
                      <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">Target: {new Date(task.due_date).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-200 mt-12 flex items-center justify-between">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} OrbitBoard Inc. Public Project View.</p>
        <a href="https://orbitboard.in" className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
          Built with OrbitBoard <ArrowRight size={12} />
        </a>
      </footer>
    </div>
  )
}
