import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Settings, Users, Shield, Trash2, Save, UserMinus, ShieldAlert, AlertTriangle, User, Mail, Phone, Key, Plus, Loader2, Bell, CreditCard, Zap, ExternalLink, CheckCircle2, XCircle, ShieldCheck, Terminal, Eye, EyeOff, FileText, Cpu, Play } from 'lucide-react'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import { getRoleLabel, canManageWorkspace, isWorkspaceOwner } from '../lib/permissions'
import { billingService } from '../lib/services/billingService'
import { supabase } from '../lib/supabase'
import AutomationBuilder from '../components/tasks/AutomationBuilder'

export default function SettingsPage({ initialTab = 'general' }) {
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

  // Notification Preferences State
  const updatePreferences = useNotificationStore((state) => state.updatePreferences)
  const [prefs, setPrefs] = useState(currentProfile?.notification_preferences || {
    assignment: true,
    mention: true,
    due_date: true,
    comment: true,
    workspace: true,
    system: true
  })
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Nudged members state
  const [nudgedUsers, setNudgedUsers] = useState({})

  // Email alerts test states
  const [testingEmails, setTestingEmails] = useState({})

  // API subpage states
  const [apiTokens, setApiTokens] = useState([
    { id: 'token-1', name: 'Production Sync Token', prefix: 'ob_live_pk_...', created: '2026-06-12', scope: 'Read/Write' },
    { id: 'token-2', name: 'Local Test integration', prefix: 'ob_test_sk_...', created: '2026-07-18', scope: 'Read Only' }
  ])
  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenScope, setNewTokenScope] = useState('Read/Write')
  const [generatedToken, setGeneratedToken] = useState('')

  // Security subpage states
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passMessage, setPassMessage] = useState('')
  const [activeSessions] = useState([
    { id: 'sess-1', device: 'Chrome on macOS', ip: '198.51.100.42', current: true, location: 'San Francisco, USA' },
    { id: 'sess-2', device: 'Safari on iPhone', ip: '203.0.113.88', current: false, location: 'San Francisco, USA' }
  ])

  // Audit Logs mock states
  const [auditQuery, setAuditQuery] = useState('')
  const [auditLogs] = useState([
    { id: 'log-1', action: 'Member Joined', actor: 'sarah.k@orbitboard.in', target: 'Sarah Jenkins', date: 'Today, 10:14 AM', ip: '198.51.100.42' },
    { id: 'log-2', action: 'Workspace Renamed', actor: 'admin@orbitboard.in', target: 'Orbit Board HQ', date: 'Yesterday, 4:22 PM', ip: '198.51.100.42' },
    { id: 'log-3', action: 'API Token Generated', actor: 'admin@orbitboard.in', target: 'Production Sync Token', date: 'Jul 12, 2026, 9:05 AM', ip: '198.51.100.42' },
    { id: 'log-4', action: 'Billing Plan Upgraded', actor: 'billing-system', target: 'Pro workspace plan', date: 'Jun 28, 2026, 11:45 PM', ip: 'N/A' },
    { id: 'log-5', action: 'Security 2FA Toggle', actor: 'sarah.k@orbitboard.in', target: 'Two-Factor Authentication Enabled', date: 'Jun 15, 2026, 2:10 PM', ip: '198.51.100.42' }
  ])

  const handleNudgeMember = async (memberId) => {
    setNudgedUsers(prev => ({ ...prev, [memberId]: 'sending' }))
    try {
      const { error } = await supabase.functions.invoke('user-emails', {
        body: {
          type: 'nudge',
          userId: memberId,
          senderName: currentProfile?.full_name || 'Your teammate'
        }
      })
      if (error) throw error
      setNudgedUsers(prev => ({ ...prev, [memberId]: 'sent' }))
      setTimeout(() => {
        setNudgedUsers(prev => ({ ...prev, [memberId]: null }))
      }, 3000)
    } catch (err) {
      console.error('Nudge failed:', err)
      setNudgedUsers(prev => ({ ...prev, [memberId]: 'error' }))
      setTimeout(() => {
        setNudgedUsers(prev => ({ ...prev, [memberId]: null }))
      }, 3000)
    }
  }

  const handleSendTestEmail = async (type) => {
    setTestingEmails(prev => ({ ...prev, [type]: 'sending' }))
    try {
      const payload = { type }
      if (type === 'nudge') {
        payload.senderName = 'Alex Mercer (Design Lead)'
      } else if (type === 'overdue') {
        payload.taskTitle = 'Design Responsive Dashboard UI'
        payload.dueDate = '07/17/2026' // Overdue test date
        payload.projectName = 'OrbitBoard Revamp'
        payload.workspaceSlug = activeWorkspace?.slug || 'personal'
        payload.projectId = '11111111-1111-1111-1111-111111111111'
      }

      const { error } = await supabase.functions.invoke('user-emails', { body: payload })
      if (error) throw error

      setTestingEmails(prev => ({ ...prev, [type]: 'sent' }))
      setTimeout(() => {
        setTestingEmails(prev => ({ ...prev, [type]: null }))
      }, 3000)
    } catch (err) {
      console.error('Test email failed:', err)
      setTestingEmails(prev => ({ ...prev, [type]: 'error' }))
      setTimeout(() => {
        setTestingEmails(prev => ({ ...prev, [type]: null }))
      }, 3000)
    }
  }

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('tab')) return params.get('tab')
    if (location.pathname.startsWith('/settings/profile')) return 'profile'
    if (location.pathname.endsWith('/team')) return 'members'
    if (location.pathname.startsWith('/settings/billing')) return 'billing'
    return initialTab
  }, [location.pathname, location.search, initialTab])

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

  // Billing State
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)
  const checkoutStatus = useMemo(() => new URLSearchParams(location.search).get('checkout'), [location.search])

  const isOwner = isWorkspaceOwner(userRole)
  const isAdmin = canManageWorkspace(userRole)

  useEffect(() => {
    if (currentProfile && !firstName && !lastName && !phone) {
      const timer = setTimeout(() => {
        setFirstName(currentProfile.first_name || '')
        setLastName(currentProfile.last_name || '')
        setPhone(currentProfile.phone || '')
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [currentProfile, firstName, lastName, phone])

  useEffect(() => {
    if (activeWorkspace && !name && !slug) {
      const timer = setTimeout(() => {
        setName(activeWorkspace.name || '')
        setSlug(activeWorkspace.slug || '')
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [activeWorkspace, name, slug])

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    const oldSlug = activeWorkspace.slug
    setSaving(true)
    await updateWorkspace(activeWorkspace.id, { name: name.trim(), slug: slug.trim() })
    setSaving(false)
    if (slug !== oldSlug) {
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

  const handleUpgrade = async () => {
    if (!activeWorkspace) return
    setCheckoutError(null)
    setStartingCheckout(true)
    const { data, error } = await billingService.createCheckoutSession(activeWorkspace.id)
    setStartingCheckout(false)

    if (error || data?.error) {
      setCheckoutError(data?.error || error?.message || 'Something went wrong starting checkout.')
      return
    }
    if (data?.url) {
      window.location.href = data.url
    }
  }

  // Security handlers
  const handleUpdatePassword = (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) return
    setPassMessage('Password updated successfully (simulation)!')
    setCurrentPassword('')
    setNewPassword('')
    setTimeout(() => setPassMessage(''), 3000)
  }

  // API Key handlers
  const handleGenerateKey = (e) => {
    e.preventDefault()
    if (!newTokenName.trim()) return
    const randKey = 'ob_' + (newTokenScope === 'Read Only' ? 'ro' : 'rw') + '_pk_' + Math.random().toString(36).substr(2, 24)
    setGeneratedToken(randKey)
    setApiTokens(prev => [
      ...prev,
      {
        id: `token-${Date.now()}`,
        name: newTokenName.trim(),
        prefix: randKey.slice(0, 14) + '...',
        created: new Date().toISOString().split('T')[0],
        scope: newTokenScope
      }
    ])
    setNewTokenName('')
  }

  const handleDeleteToken = (id) => {
    setApiTokens(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Workspace Settings</h1>
        <p className="text-gray-500">Manage your workspace preferences, members, security, and developer keys.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-56 flex-shrink-0">
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
            <button
              onClick={() => navigate('/settings?tab=notifications')}
              className={`flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Bell size={18} />
              Notifications
            </button>
            <Link
              to="/settings/billing"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Shield size={18} />
              Billing
            </Link>
            <button
              onClick={() => navigate('/settings?tab=security')}
              className={`flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'security' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck size={18} />
              Security
            </button>
            <button
              onClick={() => navigate('/settings?tab=api')}
              className={`flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'api' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Terminal size={18} />
              API Settings
            </button>
            <button
              onClick={() => navigate('/settings?tab=audit')}
              className={`flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <FileText size={18} />
              Audit Logs
            </button>
            <button
              onClick={() => navigate('/settings?tab=automations')}
              className={`flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'automations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Cpu size={18} />
              Automations
            </button>
          </nav>
        </aside>

        <main className="flex-1 overflow-hidden">
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

          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
                    <p className="text-sm text-gray-500">Choose what activities you want to be notified about.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries({
                    assignment: { title: 'Task Assignments', desc: 'When someone assigns a task to you.' },
                    mention: { title: 'Mentions', desc: 'When someone mentions you in a comment.' },
                    due_date: { title: 'Due Date Changes', desc: 'When a task due date is changed.' },
                    comment: { title: 'Comments', desc: 'When someone comments on a task you are involved in.' },
                    workspace: { title: 'Workspace Activity', desc: 'Invites and role changes in your workspaces.' },
                    system: { title: 'System Alerts', desc: 'Important system updates and task completions.' }
                  }).map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-900">{info.title}</h3>
                        <p className="text-xs text-gray-500">{info.desc}</p>
                      </div>
                      <button
                        onClick={() => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${prefs[key] ? 'bg-indigo-600' : 'bg-gray-200'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${prefs[key] ? 'translate-x-6' : ''}`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                  <button
                    onClick={async () => {
                      setSavingPrefs(true)
                      await updatePreferences(prefs)
                      setSavingPrefs(false)
                    }}
                    disabled={savingPrefs}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {savingPrefs ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Save Preferences
                  </button>
                </div>
              </section>

              {/* Email Alerts Test Center */}
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mt-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="text-amber-500" size={20} />
                    Email Alerts Test Center
                  </h2>
                  <p className="text-sm text-gray-500">
                    Instantly simulate and send test OrbitBoard email alerts directly to your registered email (<strong>{currentUser?.email}</strong>).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      id: 'welcome',
                      title: 'Welcome Email',
                      desc: 'Contains the complete list of features styled with OrbitBoard brand colors.',
                      btnText: 'Send Welcome Email'
                    },
                    {
                      id: 'nudge',
                      title: 'Team Nudge Email',
                      desc: 'Simulates a teammate sending you a nudge to complete active tasks.',
                      btnText: 'Send Nudge Email'
                    },
                    {
                      id: 'we-miss-you',
                      title: '"We Miss You" Email',
                      desc: 'Reactivation alert with our newly shipped capabilities and features.',
                      btnText: 'Send We Miss You Email'
                    },
                    {
                      id: 'overdue',
                      title: 'Overdue Task Alert',
                      desc: 'Milestone reminder highlighting an overdue task with detailed metadata.',
                      btnText: 'Send Overdue Alert'
                    }
                  ].map((test) => (
                    <div key={test.id} className="p-5 border border-gray-100 bg-gray-50/50 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">{test.title}</h3>
                        <p className="text-xs text-gray-500 mb-4">{test.desc}</p>
                      </div>
                      <button
                        onClick={() => handleSendTestEmail(test.id)}
                        disabled={testingEmails[test.id] === 'sending'}
                        className={`w-full text-center px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          testingEmails[test.id] === 'sent'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                            : testingEmails[test.id] === 'error'
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                        }`}
                      >
                        {testingEmails[test.id] === 'sending' && <Loader2 size={12} className="animate-spin" />}
                        {testingEmails[test.id] === 'sending' ? 'Sending...' : testingEmails[test.id] === 'sent' ? 'Sent!' : testingEmails[test.id] === 'error' ? 'Failed!' : test.btnText}
                      </button>
                    </div>
                  ))}
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
                      <span className="text-gray-400 text-sm">{window.location.host}/workspaces/</span>
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
                        <div className="text-xs text-gray-400 font-medium">{isWorkspaceOwner(member.role) ? 'Owner' : getRoleLabel(member.role)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {member.user_id !== currentUser.id && (
                        <button
                          onClick={() => handleNudgeMember(member.user_id)}
                          disabled={nudgedUsers[member.user_id] === 'sending'}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                            nudgedUsers[member.user_id] === 'sent'
                              ? 'bg-emerald-50 text-emerald-700'
                              : nudgedUsers[member.user_id] === 'error'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70'
                          }`}
                        >
                          {nudgedUsers[member.user_id] === 'sending' ? (
                            <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Nudging</span>
                          ) : nudgedUsers[member.user_id] === 'sent' ? (
                            'Nudged!'
                          ) : nudgedUsers[member.user_id] === 'error' ? (
                            'Failed'
                          ) : (
                            'Nudge'
                          )}
                        </button>
                      )}

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
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to transfer workspace ownership to ${member.profiles?.full_name || 'this user'}? You will lose owner permissions.`)) {
                              transferOwnership(activeWorkspace.id, member.user_id)
                            }
                          }}
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

          {activeTab === 'billing' && (
            <div className="space-y-8">
              {checkoutStatus === 'success' && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl px-5 py-4 text-sm font-bold">
                  <CheckCircle2 size={18} />
                  Payment successful! Your workspace will update to Pro shortly.
                </div>
              )}
              {checkoutStatus === 'cancelled' && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl px-5 py-4 text-sm font-bold">
                  <XCircle size={18} />
                  Checkout was cancelled. No charge was made.
                </div>
              )}
              {checkoutError && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl px-5 py-4 text-sm font-bold">
                  <XCircle size={18} />
                  {checkoutError}
                </div>
              )}

              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Current Plan</h2>
                    <p className="text-sm text-gray-500">Manage your workspace's subscription.</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                    activeWorkspace?.workspace_plan === 'free' || !activeWorkspace?.workspace_plan
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {activeWorkspace?.workspace_plan || 'free'}
                  </span>
                </div>

                {(activeWorkspace?.workspace_plan === 'free' || !activeWorkspace?.workspace_plan) ? (
                  <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-between gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Zap size={16} className="text-indigo-600" />
                        Upgrade to Pro
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm">
                        Unlimited projects, advanced reports, AI Task Mode, and priority support — $19/month.
                      </p>
                      {!isAdmin && (
                        <p className="text-xs text-rose-500 mt-2 font-bold">Only a workspace owner or admin can upgrade this workspace.</p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={handleUpgrade}
                        disabled={startingCheckout}
                        className="flex-shrink-0 flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                      >
                        {startingCheckout ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                        Upgrade to Pro
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-indigo-50 rounded-2xl p-6 flex items-center justify-between gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-indigo-900">You're on the {activeWorkspace.workspace_plan} plan</h3>
                      {activeWorkspace?.stripe_current_period_end && (
                        <p className="text-xs text-indigo-700/70 mt-1">
                          Renews on {new Date(activeWorkspace.stripe_current_period_end).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <a
                      href="mailto:support@orbitboard.in?subject=Manage%20my%20subscription"
                      className="flex-shrink-0 flex items-center gap-2 bg-white text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-indigo-100/50 transition-all"
                    >
                      <ExternalLink size={16} />
                      Manage subscription
                    </a>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Two-Factor Authentication (2FA)</h2>
                <p className="text-gray-500 text-sm mb-6">Add an extra layer of security to your account.</p>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Enable 2FA Protection</h3>
                    <p className="text-xs text-gray-500">Requires a secure verification code from Google Authenticator or Authy when signing in.</p>
                  </div>
                  <button
                    onClick={() => {
                      setIs2FAEnabled(!is2FAEnabled)
                      setShowQR(!is2FAEnabled)
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${is2FAEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${is2FAEnabled ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                {showQR && (
                  <div className="p-6 border border-indigo-100 bg-indigo-50/20 rounded-2xl flex flex-col md:flex-row items-center gap-6 animate-in fade-in duration-200">
                    <div className="w-32 h-32 bg-white border border-gray-100 p-2 rounded-xl flex items-center justify-center font-mono text-[10px] text-center text-gray-400">
                      [QR CODE SIMULATION]
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h4 className="text-sm font-bold text-gray-900">Scan QR Code</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Scan the code above with your authenticator app. Enter the 6-digit verification code below to verify your device.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          className="w-24 text-center text-sm border border-gray-200 rounded-xl px-3 py-2 font-mono"
                        />
                        <button
                          onClick={() => setShowQR(false)}
                          className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                        >
                          Verify & Activate
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Change Password</h2>
                <p className="text-gray-500 text-sm mb-6 font-medium">Keep your account secure with strong, unique passwords.</p>

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Current Password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm transition-all"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">New Password</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm pr-12 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-[32px] text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passMessage && <p className="text-xs text-emerald-600 font-bold">{passMessage}</p>}
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
                  >
                    Update Password
                  </button>
                </form>
              </section>

              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Active Sessions</h2>
                <p className="text-gray-500 text-sm mb-6">These devices are currently logged into your OrbitBoard account.</p>

                <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
                  {activeSessions.map((sess) => (
                    <div key={sess.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                          <User size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                            {sess.device}
                            {sess.current && <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest">Active now</span>}
                          </div>
                          <div className="text-[10px] text-gray-400">{sess.ip} • {sess.location}</div>
                        </div>
                      </div>
                      {!sess.current && (
                        <button className="text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-transparent hover:border-rose-100 transition-all">
                          Revoke Session
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-8">
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Developer API Settings</h2>
                <p className="text-gray-500 text-sm mb-6">Generate workspace tokens to sync projects, tasks, and integrations.</p>

                <form onSubmit={handleGenerateKey} className="flex gap-4 items-end bg-gray-50/50 p-5 rounded-2xl border border-gray-100 mb-8">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Token Name</label>
                    <input
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      placeholder="e.g. GitHub Workflow Sync"
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Scope Scope</label>
                    <select
                      value={newTokenScope}
                      onChange={(e) => setNewTokenScope(e.target.value)}
                      className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Read/Write">Read/Write</option>
                      <option value="Read Only">Read Only</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Generate Key
                  </button>
                </form>

                {generatedToken && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl mb-8 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Token Generated Successfully!</span>
                      <button
                        onClick={() => setGeneratedToken('')}
                        className="text-emerald-700 font-bold text-xs"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="text-xs text-emerald-600 mb-3">Copy this key now. For security, you won't be able to see it again.</p>
                    <div className="bg-white border border-emerald-100 font-mono text-xs p-3 rounded-xl flex items-center justify-between">
                      <span className="truncate pr-4">{generatedToken}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedToken)
                          alert('API token copied to clipboard!')
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                  {apiTokens.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic text-sm">No API keys created yet.</div>
                  ) : (
                    apiTokens.map((t) => (
                      <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50/30">
                        <div>
                          <h3 className="text-xs font-bold text-gray-900">{t.name}</h3>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t.prefix}</span>
                            <span className="text-[10px] text-gray-400">Created: {t.created}</span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t.scope}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteToken(t.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded"
                          title="Revoke Token"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Play size={18} fill="currentColor" className="text-indigo-600" />
                  Developer Quick Start
                </h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Query and orchestrate tasks programmatically using our RESTful integration endpoints.
                </p>

                <div className="bg-gray-950 rounded-2xl p-4 font-mono text-[11px] text-gray-300 space-y-2 border border-gray-900">
                  <p className="text-gray-500"># Fetch workspace active task columns</p>
                  <p className="text-emerald-400">curl -X GET "https://api.orbitboard.in/v1/tasks" \</p>
                  <p className="text-indigo-400">  -H "Authorization: Bearer ob_live_pk_YOUR_TOKEN" \</p>
                  <p className="text-amber-400">  -H "Content-Type: application/json"</p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>
                    <p className="text-gray-500 text-sm">Security events and user activities tracked in your workspace.</p>
                  </div>
                  <button
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2))
                      const dlAnchorElem = document.createElement('a')
                      dlAnchorElem.setAttribute("href", dataStr)
                      dlAnchorElem.setAttribute("download", "orbitboard_audit_logs.json")
                      dlAnchorElem.click()
                    }}
                    className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 transition-colors self-start md:self-auto"
                  >
                    <FileText size={14} />
                    Export JSON Logs
                  </button>
                </div>

                <div className="mb-4">
                  <input
                    value={auditQuery}
                    onChange={(e) => setAuditQuery(e.target.value)}
                    placeholder="Search logs by action, actor, or target..."
                    className="w-full text-xs border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                  {auditLogs.filter(log =>
                    log.action.toLowerCase().includes(auditQuery.toLowerCase()) ||
                    log.actor.toLowerCase().includes(auditQuery.toLowerCase()) ||
                    log.target.toLowerCase().includes(auditQuery.toLowerCase())
                  ).map((log) => (
                    <div key={log.id} className="p-4 hover:bg-gray-50/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {log.action}
                        </div>
                        <div className="text-gray-400 text-[10px] mt-1">
                          Actor: <strong className="text-gray-600 font-semibold">{log.actor}</strong> • Target: <strong className="text-gray-600 font-semibold">{log.target}</strong>
                        </div>
                      </div>
                      <div className="text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2">
                        <span className="text-gray-500 text-[10px] font-medium">{log.date}</span>
                        <span className="font-mono text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">IP: {log.ip}</span>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="p-8 text-center text-gray-400 italic text-sm">No audit logs matching search query.</div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'automations' && activeWorkspace && (
            <div className="space-y-6">
              <AutomationBuilder key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}