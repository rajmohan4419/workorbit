import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'

export default function FeaturesPage() {
  const features = [
    { title: 'Workspace Isolation', description: 'Keep your team, projects, and tasks organized in dedicated workspaces.' },
    { title: 'Kanban Boards', description: 'Visualize your workflow with intuitive drag-and-drop task management.' },
    { title: 'Sprint Planning', description: 'Plan and track iterations with built-in sprint support.' },
    { title: 'Real-time Updates', description: 'Stay in sync with your team with live database subscriptions.' },
    { title: 'Role-Based Access', description: 'Granular permissions for Owners, Admins, and Members.' },
    { title: 'Time Tracking', description: 'Measure productivity with integrated task timers and logs.' }
  ]

  return (
    <div className="bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">OrbitBoard</span>
        </Link>
        <div className="flex gap-6 items-center">
          <Link to="/features" className="text-sm font-medium text-indigo-600">Features</Link>
          <Link to="/pricing" className="text-sm font-medium text-gray-500 hover:text-gray-900">Pricing</Link>
          <Link to="/contact" className="text-sm font-medium text-gray-500 hover:text-gray-900">Contact</Link>
          <a href="https://app.orbitboard.in/auth" className="text-sm font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700">Sign In</a>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Powerful Features for Productive Teams</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Everything you need to manage projects and collaborate with your team, all in one place.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-8 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Check size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 bg-indigo-50 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to orbit?</h2>
          <p className="text-indigo-600 font-medium mb-8 text-lg">Join thousands of teams delivering faster with OrbitBoard.</p>
          <a href="https://app.orbitboard.in/auth" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            Get Started Free <ArrowRight size={20} />
          </a>
        </div>
      </div>
    </div>
  )
}
