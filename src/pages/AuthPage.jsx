import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function AuthPage() {
  const user = useAuthStore((state) => state.user)
  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">O</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Orbit Board</span>
          </div>
          <p className="text-gray-500 text-sm">Manage your work, your way</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#4F46E5',
                    brandAccent: '#4338CA',
                  },
                  borderWidths: { buttonBorderWidth: '1px', inputBorderWidth: '1px' },
                  radii: { borderRadiusButton: '8px', inputBorderRadius: '8px' },
                },
              },
            }}
            providers={['google']}
            redirectTo={`${window.location.origin}/`}
          />
        </div>
      </div>
    </div>
  )
}
