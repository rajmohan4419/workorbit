import { Link } from 'react-router-dom'
import { Sparkles, Brain, Zap, ArrowRight, Star, Check } from 'lucide-react'

export default function UpcomingFeaturesPage() {
  return (
    <div className="bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">orbitboard.in</span>
        </Link>
        <div className="flex gap-6 items-center">
          <Link to="/features" className="text-sm font-medium text-gray-500 hover:text-gray-900">Features</Link>
          <Link to="/pricing" className="text-sm font-medium text-gray-500 hover:text-gray-900">Pricing</Link>
          <Link to="/upcoming-features" className="text-sm font-medium text-indigo-600">What's Next</Link>
          <Link to="/auth" className="text-sm font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold mb-6 animate-pulse">
            <Sparkles size={16} />
            Future of Work
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight max-w-3xl">Introducing AI Mode: Command Your Workflow</h1>
          <p className="text-xl text-gray-500 max-w-2xl">We're building the first project management platform that works at the speed of thought. Coming Summer 2026.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-1 shadow-2xl">
            <div className="bg-gray-900 rounded-[1.8rem] overflow-hidden">
               <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs font-mono text-gray-500">Orbit AI Console</span>
                  </div>
               </div>
               <div className="p-8 font-mono text-sm space-y-6">
                 <div className="flex gap-4">
                   <span className="text-indigo-400">user@orbit:~$</span>
                   <span className="text-white">create a project "Mars Colony" with 5 tasks for habitat setup and power systems, priority high</span>
                 </div>
                 <div className="flex gap-4">
                   <span className="text-emerald-400">orbit-ai:</span>
                   <span className="text-gray-300">Executing... 🚀</span>
                 </div>
                 <div className="pl-8 space-y-2 text-gray-400 border-l border-gray-800 ml-2">
                   <div className="flex items-center gap-2">
                     <Star size={14} className="text-amber-500" />
                     <span>Workspace "Mars Exploration" initialized</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <Zap size={14} className="text-indigo-400" />
                     <span>Project "Mars Colony" created (Slug: mars-colony)</span>
                   </div>
                   <div className="flex items-center gap-2 text-emerald-400">
                     <Check size={14} />
                     <span>5 Tasks populated with AI-suggested descriptions</span>
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <span className="text-emerald-400">orbit-ai:</span>
                   <span className="text-white underline cursor-pointer hover:text-indigo-300">Open Mars Colony Board &rarr;</span>
                 </div>
               </div>
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Brain className="text-indigo-600" />
                Natural Language Actions
              </h3>
              <p className="text-gray-500 leading-relaxed text-lg">Forget clicking through menus. Type or speak commands like "assign all overdue tasks to Sarah" or "generate a sprint report for the last two weeks."</p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Sparkles className="text-indigo-600" />
                Contextual Intelligence
              </h3>
              <p className="text-gray-500 leading-relaxed text-lg">Orbit AI understands your project history. It suggests priorities, identifies potential blockers, and even drafts status updates for your stakeholders.</p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Zap className="text-indigo-600" />
                Automated Sprints
              </h3>
              <p className="text-gray-500 leading-relaxed text-lg">AI Mode can automatically move completed tasks to 'Done', rollover incomplete items, and propose goals for your next sprint based on team velocity.</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500 rounded-full blur-[120px]" />
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-8 relative z-10">Experience the future of PM.</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <input
              type="email"
              placeholder="Enter your work email"
              className="px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-80"
            />
            <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              Join Waitlist <ArrowRight size={20} />
            </button>
          </div>
          <p className="text-gray-500 mt-6 text-sm">Be the first to know when AI Mode beta opens.</p>
        </div>
      </div>
    </div>
  )
}
