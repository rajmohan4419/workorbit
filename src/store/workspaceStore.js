import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  members: [],
  invites: [],
  loading: false,
  error: null,

  reset: () => set({
    workspaces: [],
    activeWorkspace: null,
    members: [],
    invites: [],
    loading: false,
    error: null,
  }),

  fetchWorkspaces: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ workspaces: [], activeWorkspace: null, error: error.message, loading: false })
      return { error }
    }

    const activeWorkspaceId = get().activeWorkspace?.id
    const activeWorkspace = data.find((w) => w.id === activeWorkspaceId) || data[0] || null

    set({
      workspaces: data,
      activeWorkspace,
      error: null,
      loading: false,
    })

    if (activeWorkspace) {
        get().fetchWorkspaceMembers(activeWorkspace.id)
    }

    return { data }
  },

  setActiveWorkspace: (workspace) => {
    set({ activeWorkspace: workspace })
    if (workspace) {
      get().fetchWorkspaceMembers(workspace.id)
      get().fetchWorkspaceInvites(workspace.id)
    }
  },

  setActiveWorkspaceBySlug: async (slug) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      set({ loading: false, error: error.message })
      return { error }
    }

    // Double check membership via another query if needed,
    // but RLS should already handle this.
    // However, the user wants a verification step.
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', data.id)
      .eq('user_id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle()

    const isOwner = data.owner_id === (await supabase.auth.getUser()).data.user.id

    if (!member && !isOwner) {
      set({ loading: false, error: 'Access Denied' })
      return { error: { message: 'Access Denied', status: 403 } }
    }

    set({ activeWorkspace: data, loading: false })
    get().fetchWorkspaceMembers(data.id)
    get().fetchWorkspaceInvites(data.id)
    return { data }
  },

  createWorkspace: async ({ name, slug }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: 'Not authenticated' } }

    const { data, error } = await supabase
      .from('workspaces')
      .insert([{ name, slug, owner_id: user.id }])
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      workspaces: [data, ...state.workspaces],
      activeWorkspace: data,
      error: null,
    }))

    return { data }
  },

  fetchWorkspaceMembers: async (workspaceId) => {
    // 1. Fetch workspace to get owner_id
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()

    if (wsError) return { error: wsError }

    // 2. Fetch members
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('*, profiles!workspace_members_user_id_fkey(*)')
      .eq('workspace_id', workspaceId)

    if (membersError) return { error: membersError }

    // 3. Check if owner is already in members (they might be)
    const isOwnerInMembers = members.some(m => m.user_id === workspace.owner_id)

    if (!isOwnerInMembers) {
      // Fetch owner profile
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', workspace.owner_id)
        .single()

      if (!ownerError && ownerProfile) {
        members.push({
          workspace_id: workspaceId,
          user_id: workspace.owner_id,
          role: 'owner',
          profiles: ownerProfile
        })
      }
    }

    set({ members })
    return { data: members }
  },

  updateWorkspace: async (workspaceId, { name, slug }) => {
    const { data, error } = await supabase
      .from('workspaces')
      .update({ name, slug })
      .eq('id', workspaceId)
      .select()
      .single()

    if (error) return { error }
    set((state) => ({
      workspaces: state.workspaces.map(w => w.id === workspaceId ? data : w),
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? data : state.activeWorkspace
    }))
    return { data }
  },

  deleteWorkspace: async (workspaceId) => {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)

    if (error) return { error }
    set((state) => ({
      workspaces: state.workspaces.filter(w => w.id !== workspaceId),
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? (state.workspaces.find(w => w.id !== workspaceId) || null) : state.activeWorkspace
    }))
    return {}
  },

  updateMemberRole: async (workspaceId, userId, role) => {
    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)

    if (error) return { error }
    set((state) => ({
      members: state.members.map(m => m.user_id === userId ? { ...m, role } : m)
    }))
    return {}
  },

  removeMember: async (workspaceId, userId) => {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)

    if (error) return { error }
    set((state) => ({
      members: state.members.filter(m => m.user_id !== userId)
    }))
    return {}
  },

  transferOwnership: async (workspaceId, newOwnerId) => {
    // This usually requires a specialized function or a transaction
    // For now, we update the workspaces table
    const { error } = await supabase
      .from('workspaces')
      .update({ owner_id: newOwnerId })
      .eq('id', workspaceId)

    if (error) return { error }

    // Also update activeWorkspace in state
    set((state) => ({
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? { ...state.activeWorkspace, owner_id: newOwnerId } : state.activeWorkspace,
      workspaces: state.workspaces.map(w => w.id === workspaceId ? { ...w, owner_id: newOwnerId } : w)
    }))

    return {}
  },

  fetchWorkspaceInvites: async (workspaceId) => {
    const { data, error } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (error) return { error }
    set({ invites: data })
    return { data }
  },

  createWorkspaceInvite: async (workspaceId, email, role = 'member') => {
    const { data, error } = await supabase
      .from('workspace_invites')
      .insert([{ workspace_id: workspaceId, email, role }])
      .select()
      .single()

    if (error) return { error }
    set((state) => ({ invites: [data, ...state.invites] }))
    return { data }
  },

  deleteWorkspaceInvite: async (id) => {
    const { error } = await supabase.from('workspace_invites').delete().eq('id', id)
    if (error) return { error }
    set((state) => ({ invites: state.invites.filter((i) => i.id !== id) }))
    return {}
  },

  acceptWorkspaceInvite: async (inviteId) => {
    const { data: invite, error: fetchError } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('id', inviteId)
      .single()

    if (fetchError) return { error: fetchError }

    const userId = (await supabase.auth.getUser()).data.user.id

    const { error: memberError } = await supabase
      .from('workspace_members')
      .upsert([{ workspace_id: invite.workspace_id, user_id: userId, role: invite.role }], { onConflict: 'workspace_id, user_id' })

    if (memberError) return { error: memberError }

    await supabase.from('workspace_invites').delete().eq('id', inviteId)

    return { workspaceId: invite.workspace_id }
  },
}))
