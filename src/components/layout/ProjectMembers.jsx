import { useState, useEffect } from 'react'
import { UserPlus, Mail, X, Loader2, Trash2 } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { canInviteMembers } from '../../lib/permissions'

export default function ProjectMembers({ projectId }) {
  const wsRole = useWorkspaceStore((state) => state.currentUserRole)
  const projectMembers = useProjectStore((state) => state.members)
  const projectInvites = useProjectStore((state) => state.invites)
  const fetchProjectMembers = useProjectStore((state) => state.fetchMembers)
  const fetchProjectInvites = useProjectStore((state) => state.fetchInvites)
  const createProjectInvite = useProjectStore((state) => state.createInvite)
  const deleteProjectInvite = useProjectStore((state) => state.deleteInvite)
  
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (projectId) {
      fetchProjectMembers(projectId)
      fetchProjectInvites(projectId)
    }
  }, [projectId, fetchProjectMembers, fetchProjectInvites])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!email.trim() || !projectId) return

    setInviting(true)
    setError('')
    const { error } = await createProjectInvite(projectId, email.trim(), role)
    setInviting(false)

    if (error) {
      setError(error.message)
    } else {
      setEmail('')
      setRole('member')
      setIsInviteOpen(false)
    }
  }

  const canInvite = canInviteMembers(wsRole)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Project Members</h2>
        {canInvite && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <UserPlus size={14} />
            Invite to Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projectMembers.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
              {member.profiles?.full_name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.profiles?.full_name}</p>
              <p className="text-[10px] text-gray-400 capitalize">{member.role || 'Member'}</p>
            </div>
          </div>
        ))}
      </div>

      {projectInvites.length > 0 && (
        <div className="pt-4 border-t border-gray-50">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pending Project Invites</h3>
          <div className="space-y-2">
            {projectInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50/50 border border-gray-100 rounded-xl border-dashed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Mail size={14} />
                  </div>
                  <span className="text-sm text-gray-600">{invite.email}</span>
                </div>
                {canInvite && (
                  <button
                    onClick={() => deleteProjectInvite?.(invite.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isInviteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsInviteOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    autoFocus
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full text-sm border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={inviting || !email.trim()}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {inviting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Send Invite
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
