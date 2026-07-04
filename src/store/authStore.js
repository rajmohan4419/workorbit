import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useWorkspaceStore } from './workspaceStore'

export const useAuthStore = create((set, get) => ({
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

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (!session) {
        set({ loading: false })
        return
      }

      const user = session.user
      fetchProfile(user.id).then(profile => {
        if (!active) return
        set({ session, user, profile, loading: false })
        useWorkspaceStore.getState().fetchWorkspaces()
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      const user = session?.user ?? null

      try {
        const profile = await fetchProfile(user?.id)
        set({ session, user, profile, loading: false })
      } catch (err) {
        console.error('Error in authChange fetchProfile:', err)
        set({ session, user, profile: null, loading: false })
      }

      if (user) {
        useWorkspaceStore.getState().fetchWorkspaces()
      } else {
        useWorkspaceStore.getState().reset()
        set({ loading: false })
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  },

  updateProfile: async (updates) => {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return { error: { message: 'Not authenticated' } }

    const finalUpdates = { ...updates }
    if (updates.first_name || updates.last_name) {
      const currentProfile = get().profile
      const firstName = updates.first_name ?? currentProfile?.first_name ?? ''
      const lastName = updates.last_name ?? currentProfile?.last_name ?? ''
      finalUpdates.full_name = `${firstName} ${lastName}`.trim()
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(finalUpdates)
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
