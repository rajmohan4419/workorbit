import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useWorkspaceStore } from './workspaceStore'

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  profiles: [],
  session: null,
  loading: true,
  error: null,

  init: () => {
    let active = true
    set({ loading: true })

    const fetchProfile = async (userId) => {
      if (!userId) return null
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) {
          console.error('Error fetching profile:', error.message)
          return null
        }
        return data
      } catch (err) {
        console.error('Unexpected error fetching profile:', err)
        return null
      }
    }

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!active) return

      if (error) {
        set({ session: null, user: null, profile: null, loading: false })
        return
      }

      const user = session?.user ?? null
      const profile = await fetchProfile(user?.id)
      set({ session, user, profile, loading: false })

      if (user) {
        useWorkspaceStore.getState().fetchWorkspaces()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      const user = session?.user ?? null
      const profile = await fetchProfile(user?.id)
      set({ session, user, profile, loading: false })

      if (user) {
        useWorkspaceStore.getState().fetchWorkspaces()
      } else {
        useWorkspaceStore.getState().reset()
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  },

  fetchAllProfiles: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      set({ error: error.message })
      return { error }
    }
    set({ profiles: data, error: null })
    return { data }
  },

  updateProfileRole: async (userId, role) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return { error }
    }
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === userId ? data : p)),
      error: null,
    }))
    return { data }
  },

  updateProfile: async (updates) => {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return { error: { message: 'Not authenticated' } }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      profile: data,
      profiles: state.profiles.map((p) => (p.id === userId ? data : p)),
      error: null,
    }))
    return { data }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) return { error }
    set({ user: null, profile: null, session: null })
    return {}
  },
}))
