import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Rocket, Zap, Shield } from 'lucide-react'
import SEO from '../../components/layout/SEO'
import { getAppUrl } from '../../lib/utils/domain'
import heroIllustration from '../../assets/hero-illustration.svg'

export default function HomePage() {
  return (
    <div className="bg-brand-warm min-h-screen">
      <SEO
        title="Project Management for Indian Startups"
        description="The fastest, most intuitive project management tool built for founders and high-growth teams in India. OrbitBoard helps you move from idea to delivery at light speed."
        canonical="https://orbitboard.in/"
      />

      {/* Navigation */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">OrbitBoard</span>
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <Link to="/features" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Features</Link>
          <Link to="/pricing" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</Link>
          <Link to="/contact" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Contact</Link>
          <a href={getAppUrl('/auth')} className="text-sm font-bold text-white bg-indigo-600 px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">Sign In</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold mb-6">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Built for Indian Startups & Founders
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Manage projects at the speed of <span className="text-indigo-600">thought.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-lg">
            Stop fighting with complex tools. OrbitBoard is the high-velocity project hub for teams that need to build, ship, and scale without the friction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href={getAppUrl('/auth')} className="inline-flex items-center justify-center gap-2 bg-brand-accent text-white px-8 py-4 rounded-2xl text-lg font-bold hover:opacity-90 transition-all shadow-xl shadow-orange-200">
              Get Started Free <ArrowRight size={20} />
            </a>
            <Link to="/features" className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-gray-50 transition-all">
              See How It Works
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" /> No credit card required
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" /> Setup in 2 minutes
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-indigo-500/10 rounded-[2rem] blur-2xl -z-10"></div>
          <img
            src={heroIllustration}
            alt="OrbitBoard Project Management Illustration"
            className="w-full h-auto drop-shadow-2xl"
          />
        </div>
      </section>

      {/* Social Proof / Trust Marks */}
      <section className="bg-white border-y border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Powering high-growth teams</p>
          <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-60">
            {/* Logos would go here, using placeholders for now */}
            <span className="text-2xl font-black text-gray-900">ZEPTO-STYLE</span>
            <span className="text-2xl font-black text-gray-900">BHOOMI</span>
            <span className="text-2xl font-black text-gray-900">TECH-CURRY</span>
            <span className="text-2xl font-black text-gray-900">CREW-CUT</span>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why founders choose OrbitBoard</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">We cut out the enterprise bloat so you can focus on what matters: building your product.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Zap className="text-amber-500" />, title: 'Lightning Fast', desc: 'No loading screens. No bloat. Just speed. Our real-time engine keeps everyone in sync instantly.' },
            { icon: <Rocket className="text-indigo-600" />, title: 'Built for Scale', desc: 'From solo-founder to 100+ employees. OrbitBoard grows with your workspace needs.' },
            { icon: <Shield className="text-emerald-500" />, title: 'India-First Billing', desc: 'Compliant GST invoicing and local payment methods that actually work.' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="bg-indigo-900 rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl"></div>

          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 relative z-10">Stop managing. Start building.</h2>
          <p className="text-indigo-200 text-lg lg:text-xl mb-10 max-w-2xl mx-auto relative z-10">
            Join the community of ambitious Indian founders who are delivering faster with OrbitBoard.
          </p>
          <a href={getAppUrl('/auth')} className="inline-flex items-center gap-2 bg-brand-accent text-white px-10 py-5 rounded-2xl text-xl font-bold hover:opacity-90 transition-all shadow-2xl shadow-black/20 relative z-10">
            Launch Your Workspace <ArrowRight size={24} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-[10px] text-white font-bold">O</div>
            <span className="font-bold text-gray-900">OrbitBoard</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <Link to="/features" className="hover:text-indigo-600 transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
            <Link to="/upcoming-features" className="hover:text-indigo-600 transition-colors">Roadmap</Link>
          </div>
          <p className="text-sm text-gray-400">© 2025 OrbitBoard. Built for speed.</p>
        </div>
      </footer>
    </div>
  )
}
