import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import SEO from '../../components/layout/SEO'
import { getAppUrl } from '../../lib/utils/domain'

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
    <div className="bg-brand-warm">
      <SEO
        title="Pricing - Simple and Transparent"
        description="OrbitBoard pricing plans for teams of all sizes. Start for free and upgrade as you grow with our Pro and Enterprise plans."
        canonical="https://orbitboard.in/pricing"
      />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Is there a free trial?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "OrbitBoard has a forever-free plan for up to 3 projects. No credit card required to start."
              }
            },
            {
              "@type": "Question",
              "name": "Can I cancel anytime?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, you can cancel your subscription at any time from your billing settings."
              }
            },
            {
              "@type": "Question",
              "name": "Do you offer discounts for startups?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Our Pro plan is already priced for startups. For early-stage teams, our free plan is often all you need."
              }
            }
          ]
        })}
      </script>
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">OrbitBoard</span>
        </Link>
        <div className="flex gap-6 items-center">
          <Link to="/features" className="text-sm font-medium text-gray-500 hover:text-gray-900">Features</Link>
          <Link to="/pricing" className="text-sm font-medium text-indigo-600">Pricing</Link>
          <Link to="/contact" className="text-sm font-medium text-gray-500 hover:text-gray-900">Contact</Link>
          <a href={getAppUrl('/auth')} className="text-sm font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700">Sign In</a>
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
              <a
                href={getAppUrl('/auth')}
                className={`w-full py-4 rounded-xl text-center font-bold transition-all ${p.highlight ? 'bg-brand-accent text-white hover:opacity-90 shadow-lg shadow-orange-200' : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'}`}
              >
                {p.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
