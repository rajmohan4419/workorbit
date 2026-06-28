import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '0',
      description: 'Perfect for side projects and small teams.',
      features: ['Up to 3 projects', 'Unlimited tasks', 'Basic Kanban', 'Real-time updates']
    },
    {
      name: 'Pro',
      price: '19',
      description: 'For growing teams that need more control.',
      features: ['Unlimited projects', 'Advanced reports', 'AI Task Mode', 'Priority Support'],
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'Scalable solutions for large organizations.',
      features: ['SSO & SAML', 'Custom Domain', 'Audit Logs', 'Dedicated Manager']
    }
  ]

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
          <Link to="/pricing" className="text-sm font-medium text-indigo-600">Pricing</Link>
          <Link to="/contact" className="text-sm font-medium text-gray-500 hover:text-gray-900">Contact</Link>
          <Link to="/auth" className="text-sm font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Choose the plan that fits your team's needs. Start for free, upgrade as you grow.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((p, i) => (
            <div key={i} className={`p-8 rounded-3xl border ${p.highlight ? 'border-indigo-600 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50' : 'border-gray-100'} flex flex-col`}>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{p.name}</h3>
                <p className="text-sm text-gray-500">{p.description}</p>
              </div>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-gray-900">{p.price === 'Custom' ? '' : '$'}{p.price}</span>
                {p.price !== 'Custom' && <span className="text-gray-400 font-medium">/month</span>}
              </div>
              <div className="space-y-4 mb-10 flex-1">
                {p.features.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check size={12} />
                    </div>
                    <span className="text-sm text-gray-600">{f}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/auth"
                className={`w-full py-4 rounded-xl text-center font-bold transition-all ${p.highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-900 hover:bg-gray-100'}`}
              >
                {p.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
