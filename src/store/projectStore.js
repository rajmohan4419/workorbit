import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useProjectStore = create((set, get) => ({
  projects: [],
  members: [],
  invites: [],
  activeProject: null,
  loading: false,
  error: null,

  reset: () => set({
    projects: [],
    members: [],
    invites: [],
    activeProject: null,
    loading: false,
    error: null,
  }),

  fetchProjects: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ projects: [], activeProject: null, error: error.message, loading: false })
      return { error }
    }

    const activeProjectId = get().activeProject?.id

    set({
      projects: data,
      activeProject: data.find((project) => project.id === activeProjectId) ?? null,
      error: null,
      loading: false,
    })

    return { data }
  },

  setActiveProject: (project) => set({ activeProject: project }),

  createProject: async ({ name, description }) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ name, description }])
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      projects: [data, ...state.projects],
      activeProject: data,
      error: null,
    }))

    return { data }
  },

  updateProject: async (id, updates) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? data : p)),
      activeProject: state.activeProject?.id === id ? data : state.activeProject,
      error: null,
    }))
    return { data }
  },

  deleteProject: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
      error: null,
    }))
    return {}
  },

  fetchMembers: async (projectId) => {
    const { data, error } = await supabase
      .from('project_members')
      .select('*, profiles(*)')
      .eq('project_id', projectId)

    if (error) return { error }
    set({ members: data })
    return { data }
  },

  fetchInvites: async (projectId) => {
    const { data, error } = await supabase
      .from('project_invites')
      .select('*')
      .eq('project_id', projectId)

    if (error) return { error }
    set({ invites: data })
    return { data }
  },

  createInvite: async (projectId, email) => {
    const { data, error } = await supabase
      .from('project_invites')
      .insert([{ project_id: projectId, email }])
      .select()
      .single()

    if (error) return { error }
    set((state) => ({ invites: [data, ...state.invites] }))
    return { data }
  },

  deleteInvite: async (id) => {
    const { error } = await supabase.from('project_invites').delete().eq('id', id)
    if (error) return { error }
    set((state) => ({ invites: state.invites.filter((i) => i.id !== id) }))
    return {}
  },

  acceptInvite: async (inviteId) => {
    // In a real app, this would involve a more complex flow (edge function or similar)
    // For now, we'll simulate it by adding the user to project_members and deleting the invite
    const { data: invite, error: fetchError } = await supabase
      .from('project_invites')
      .select('*')
      .eq('id', inviteId)
      .single()

    if (fetchError) return { error: fetchError }

    const { error: memberError } = await supabase
      .from('project_members')
      .insert([{ project_id: invite.project_id, user_id: (await supabase.auth.getUser()).data.user.id }])

    if (memberError) return { error: memberError }

    await supabase.from('project_invites').delete().eq('id', inviteId)

    return { projectId: invite.project_id }
  },
}))
