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
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*, profiles!workspace_members_user_id_fkey(*)')
      .eq('workspace_id', workspaceId)

    if (error) return { error }
    set({ members: data })
    return { data }
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
