import { Link } from 'react-router-dom'
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
        <ShieldAlert size={40} />
      </div>
      <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">403 Access Denied</h1>
      <p className="text-gray-500 max-w-md mb-10 leading-relaxed">
        You don't have permission to access this workspace. It may be private or you might not be a member yet.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Home size={18} />
          Go to Dashboard
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </div>
    </div>
  )
}
