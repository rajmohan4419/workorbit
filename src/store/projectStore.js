import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useProjectStore = create((set, get) => ({
  projects: [],
  activeProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) set({ error: error.message, loading: false })
    else set({ projects: data, loading: false })
  },

  setActiveProject: (project) => set({ activeProject: project }),

  createProject: async ({ name, description }) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ name, description }])
      .select()
      .single()

    if (error) return { error }
    set((state) => ({ projects: [data, ...state.projects], activeProject: data }))
    return { data }
  },

  updateProject: async (id, updates) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return { error }
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? data : p)),
      activeProject: state.activeProject?.id === id ? data : state.activeProject,
    }))
    return { data }
  },

  deleteProject: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) return { error }
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
    }))
    return {}
  },
}))
