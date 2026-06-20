import { useState } from 'react'
import { Users, Shield, User, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function UsersPage() {
  const [updating, setUpdating] = useState(null)

  const updateProfileRole = useAuthStore((state) => state.updateProfileRole)
  const currentProfile = useAuthStore((state) => state.profile)
  const profiles = useAuthStore((state) => state.profiles)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId)
    const { error } = await updateProfileRole(userId, newRole)
    setUpdating(null)

    if (error) {
      alert(error.message)
    }
  }

  if (loading && profiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage workspace members and their roles.</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2">
          <Users size={18} />
          <span className="text-sm font-semibold">{profiles.length} Total Users</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {profiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {profile.full_name?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                      <p className="text-xs text-gray-400">{profile.id === currentProfile?.id ? 'You' : 'Workspace Member'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    profile.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                    profile.role === 'member' ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {profile.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                    <span className="capitalize">{profile.role}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {currentProfile?.role === 'admin' && profile.id !== currentProfile.id ? (
                    <select
                      value={profile.role}
                      disabled={updating === profile.id}
                      onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No actions available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
