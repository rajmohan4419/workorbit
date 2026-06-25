import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { workspaceService } from '../lib/services/workspaceService'

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  currentUserRole: null,
  members: [],
  invites: [],
  loading: false,
  error: null,

  reset: () => set({
    workspaces: [],
    activeWorkspace: null,
    currentUserRole: null,
    members: [],
    invites: [],
    loading: false,
    error: null,
  }),

  fetchWorkspaces: async () => {
    set({ loading: true, error: null })
    const { data, error } = await workspaceService.fetchWorkspaces()

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

  setActiveWorkspace: async (workspace) => {
    if (!workspace) {
      set({ activeWorkspace: null, currentUserRole: null })
      return
    }

    // Refresh to get the latest role
    const { data, role, error } = await workspaceService.getWorkspaceBySlug(workspace.slug)
    if (!error) {
      set({ activeWorkspace: data, currentUserRole: role })
      get().fetchWorkspaceMembers(data.id)
      get().fetchWorkspaceInvites(data.id)
    } else {
      set({ activeWorkspace: workspace, currentUserRole: 'viewer' })
    }
  },

  setActiveWorkspaceBySlug: async (slug) => {
    set({ loading: true })
    const { data, role, error } = await workspaceService.getWorkspaceBySlug(slug)

    if (error) {
      set({ loading: false, error: error.message })
      return { error }
    }

    set({ activeWorkspace: data, currentUserRole: role, loading: false })
    get().fetchWorkspaceMembers(data.id)
    get().fetchWorkspaceInvites(data.id)
    return { data, role }
  },

  createWorkspace: async ({ name, slug }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: 'Not authenticated' } }

    const { data, error } = await workspaceService.createWorkspace({ name, slug, owner_id: user.id })

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
    const { data: members, error } = await workspaceService.fetchMembers(workspaceId)

    if (error) return { error }

    set({ members })
    return { data: members }
  },

  updateWorkspace: async (workspaceId, updates) => {
    const { data, error } = await workspaceService.updateWorkspace(workspaceId, updates)

    if (error) return { error }
    set((state) => ({
      workspaces: state.workspaces.map(w => w.id === workspaceId ? data : w),
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? data : state.activeWorkspace
    }))
    return { data }
  },

  deleteWorkspace: async (workspaceId) => {
    const { error } = await workspaceService.deleteWorkspace(workspaceId)

    if (error) return { error }
    set((state) => ({
      workspaces: state.workspaces.filter(w => w.id !== workspaceId),
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? (state.workspaces.find(w => w.id !== workspaceId) || null) : state.activeWorkspace
    }))
    return {}
  },

  updateMemberRole: async (workspaceId, userId, role) => {
    const { error } = await workspaceService.updateMemberRole(workspaceId, userId, role)

    if (error) return { error }
    set((state) => ({
      members: state.members.map(m => m.user_id === userId ? { ...m, role } : m)
    }))
    return {}
  },

  removeMember: async (workspaceId, userId) => {
    const { error } = await workspaceService.removeMember(workspaceId, userId)

    if (error) return { error }
    set((state) => ({
      members: state.members.filter(m => m.user_id !== userId)
    }))
    return {}
  },

  transferOwnership: async (workspaceId, newOwnerId) => {
    const { error } = await workspaceService.transferOwnership(workspaceId, newOwnerId)

    if (error) return { error }

    // Also update activeWorkspace in state
    set((state) => ({
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? { ...state.activeWorkspace, owner_id: newOwnerId } : state.activeWorkspace,
      workspaces: state.workspaces.map(w => w.id === workspaceId ? { ...w, owner_id: newOwnerId } : w)
    }))

    return {}
  },

  fetchWorkspaceInvites: async (workspaceId) => {
    const { data, error } = await workspaceService.fetchInvites(workspaceId)

    if (error) return { error }
    set({ invites: data })
    return { data }
  },

  createWorkspaceInvite: async (workspaceId, email, role = 'member') => {
    const { data, error } = await workspaceService.createInvite(workspaceId, email, role)

    if (error) return { error }
    set((state) => ({ invites: [data, ...state.invites] }))
    return { data }
  },

  deleteWorkspaceInvite: async (id) => {
    const { error } = await workspaceService.deleteInvite(id)
    if (error) return { error }
    set((state) => ({ invites: state.invites.filter((i) => i.id !== id) }))
    return {}
  },

  acceptWorkspaceInvite: async (inviteId) => {
    const userId = (await supabase.auth.getUser()).data.user.id
    const result = await workspaceService.acceptInvite(inviteId, userId)

    return result
  },
}))
