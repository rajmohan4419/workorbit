import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { Settings, Users, Shield, Trash2, Save, UserMinus, ShieldAlert, AlertTriangle, User, Mail, Phone, Key, Plus, Loader2 } from 'lucide-react'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useAuthStore } from '../store/authStore'
import { getRoleLabel } from '../lib/permissions'

export default function SettingsPage({ initialTab = 'general' }) {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace)
  const userRole = useWorkspaceStore((state) => state.currentUserRole)
  const members = useWorkspaceStore((state) => state.members)
  const updateWorkspace = useWorkspaceStore((state) => state.updateWorkspace)
  const deleteWorkspace = useWorkspaceStore((state) => state.deleteWorkspace)
  const updateMemberRole = useWorkspaceStore((state) => state.updateMemberRole)
  const removeMember = useWorkspaceStore((state) => state.removeMember)
  const transferOwnership = useWorkspaceStore((state) => state.transferOwnership)
  const createWorkspaceInvite = useWorkspaceStore((state) => state.createWorkspaceInvite)

  const currentUser = useAuthStore((state) => state.user)
  const currentProfile = useAuthStore((state) => state.profile)
  const updateProfile = useAuthStore((state) => state.updateProfile)

  const activeTab = useMemo(() => {
    if (location.pathname.startsWith('/settings/profile')) return 'profile'
    if (location.pathname.endsWith('/team')) return 'members'
    if (location.pathname.startsWith('/settings/billing')) return 'billing'
    return initialTab
  }, [location.pathname, initialTab])

  // Workspace State
  const [name, setName] = useState(activeWorkspace?.name || '')
  const [slug, setSlug] = useState(activeWorkspace?.slug || '')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Profile State
  const [firstName, setFirstName] = useState(currentProfile?.first_name || '')
  const [lastName, setLastName] = useState(currentProfile?.last_name || '')
  const [phone, setPhone] = useState(currentProfile?.phone || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Invite State
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [sendingInvite, setSendingInvite] = useState(false)

  const isOwner = userRole === 'owner'
  const isAdmin = userRole === 'admin' || isOwner

  useEffect(() => {
    if (currentProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirstName(currentProfile.first_name || '')

      setLastName(currentProfile.last_name || '')

      setPhone(currentProfile.phone || '')
    }
  }, [currentProfile])

  useEffect(() => {
    if (activeWorkspace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(activeWorkspace.name || '')

      setSlug(activeWorkspace.slug || '')
    }
  }, [activeWorkspace])

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setSaving(true)
    await updateWorkspace(activeWorkspace.id, { name: name.trim(), slug: slug.trim() })
    setSaving(false)
    if (slug !== workspaceSlug) {
      navigate(`/workspaces/${slug}/settings`)
    }
  }

  const handleDelete = async () => {
    if (!isOwner) return
    await deleteWorkspace(activeWorkspace.id)
    navigate('/')
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    await updateProfile({
      first_name: firstName,
      last_name: lastName,
      phone: phone
    })
    setSavingProfile(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSendingInvite(true)
    await createWorkspaceInvite(activeWorkspace.id, inviteEmail.trim(), inviteRole)
    setInviteEmail('')
    setSendingInvite(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Workspace Settings</h1>
        <p className="text-gray-500">Manage your workspace preferences, members, and roles.</p>
      </div>

      <div className="flex gap-8">
        <aside className="w-48 flex-shrink-0">
          <nav className="flex flex-col gap-1">
            <Link
              to={activeWorkspace ? `/workspaces/${activeWorkspace.slug}/settings` : "/settings/workspace"}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Settings size={18} />
              General
            </Link>
            <Link
              to="/settings/profile"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <User size={18} />
              My Profile
            </Link>
            {activeWorkspace && (
              <Link
                to={`/workspaces/${activeWorkspace.slug}/team`}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'members' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Users size={18} />
                Members
              </Link>
            )}
            <Link
              to="/settings/billing"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Shield size={18} />
              Billing
            </Link>
          </nav>
        </aside>

        <main className="flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">First Name</label>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm transition-all"
                        placeholder="e.g. John"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Last Name</label>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm transition-all"
                        placeholder="e.g. Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed">
                      <Mail size={16} />
                      {currentUser?.email}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl pl-12 pr-4 py-3 text-sm transition-all"
                        placeholder="e.g. +1 234 567 8900"
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Update Profile
                    </button>
                  </div>
                </form>
              </section>

              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Key size={20} className="text-indigo-600" />
                  Your Permissions
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-700">Workspace Role:</span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                      {getRoleLabel(userRole)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Permissions Assigned</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Create Projects', allowed: userRole !== 'viewer' },
                        { label: 'Manage Members', allowed: isAdmin },
                        { label: 'Delete Projects', allowed: isOwner },
                        { label: 'Create Tasks', allowed: userRole !== 'viewer' },
                        { label: 'Manage Roles', allowed: isAdmin },
                        { label: 'Workspace Settings', allowed: isAdmin },
                      ].map((perm) => (
                        <div key={perm.label} className="flex items-center gap-2 text-sm">
                          <div className={`w-1.5 h-1.5 rounded-full ${perm.allowed ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          <span className={perm.allowed ? 'text-gray-700 font-medium' : 'text-gray-400 line-through'}>{perm.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-8">
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Workspace Details</h2>
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Workspace Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Workspace Slug</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">app.orbitboard.in/workspaces/</span>
                      <input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        disabled={!isAdmin}
                        className="flex-1 bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm transition-all"
                      />
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                      >
                        {saving ? <Shield className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                      </button>
                    </div>
                  )}
                </form>
              </section>

              {isOwner && (
                <section className="bg-rose-50 rounded-3xl p-8 border border-rose-100">
                  <h2 className="text-xl font-bold text-rose-900 mb-2 flex items-center gap-2">
                    <ShieldAlert size={20} />
                    Danger Zone
                  </h2>
                  <p className="text-rose-700/70 text-sm mb-6 leading-relaxed">
                    Once you delete a workspace, there is no going back. This will permanently delete all projects, tasks, and data associated with this workspace.
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-rose-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-rose-700 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      Delete Workspace
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-rose-900 font-bold text-sm flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Are you absolutely sure?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          className="bg-rose-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 transition-all"
                        >
                          Yes, Delete Workspace
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="bg-white text-rose-600 border border-rose-200 px-6 py-2 rounded-xl text-sm font-bold hover:bg-rose-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-8">
              {isAdmin && (
                <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Plus size={20} className="text-indigo-600" />
                    Invite User
                  </h2>
                  <form onSubmit={handleInvite} className="flex gap-4">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm transition-all"
                        required
                      />
                    </div>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm transition-all font-bold text-gray-600"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="submit"
                      disabled={sendingInvite}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
                    >
                      {sendingInvite ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                      Send Invite
                    </button>
                  </form>
                </section>
              )}

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50">
                  <h2 className="text-xl font-bold text-gray-900">Workspace Members</h2>
                  <p className="text-gray-500 text-sm mt-1">Manage who has access to this workspace and what they can do.</p>
                </div>
                <div className="divide-y divide-gray-50">
                {members.map((member) => (
                  <div key={member.user_id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                        {member.profiles?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          {member.profiles?.full_name || 'Unknown User'}
                          {member.user_id === currentUser.id && <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] text-gray-500 font-black uppercase tracking-widest">You</span>}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">{member.role === 'owner' ? 'Owner' : getRoleLabel(member.role)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isAdmin && member.user_id !== currentUser.id && member.role !== 'owner' && (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(activeWorkspace.id, member.user_id, e.target.value)}
                            className="bg-gray-100 border-none rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => removeMember(activeWorkspace.id, member.user_id)}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Remove Member"
                          >
                            <UserMinus size={18} />
                          </button>
                        </>
                      )}

                      {isOwner && member.user_id !== currentUser.id && (
                        <button
                          onClick={() => transferOwnership(activeWorkspace.id, member.user_id)}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          Make Owner
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
