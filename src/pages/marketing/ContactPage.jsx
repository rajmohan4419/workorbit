import { Link } from 'react-router-dom'
import { Mail, MessageSquare, MapPin, Send } from 'lucide-react'
import SEO from '../../components/layout/SEO'

export default function ContactPage() {
  return (
    <div className="bg-white">
      <SEO
        title="Contact Us - We're Here to Help"
        description="Get in touch with the OrbitBoard team for support, sales inquiries, or feedback."
        canonical="https://orbitboard.in/contact"
      />
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
          <Link to="/contact" className="text-sm font-medium text-indigo-600">Contact</Link>
          <Link to="/auth" className="text-sm font-bold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700">Sign In</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Get in touch</h1>
            <p className="text-xl text-gray-500 mb-12">Have questions about Orbit Board? We're here to help you get the most out of your team's workflow.</p>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Email us</h3>
                  <p className="text-gray-500">support@orbitboard.in</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Live Chat</h3>
                  <p className="text-gray-500">Available Mon-Fri, 9am-6pm IST</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Office</h3>
                  <p className="text-gray-500">Orbit Tower, Outer Ring Road, Bengaluru</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
            <form className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">First Name</label>
                  <input className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="John" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Last Name</label>
                  <input className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Work Email</label>
                <input className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="john@company.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Message</label>
                <textarea rows={5} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none" placeholder="How can we help you?" />
              </div>
              <button className="w-full bg-indigo-600 text-white rounded-xl py-4 text-lg font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                <Send size={20} />
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
