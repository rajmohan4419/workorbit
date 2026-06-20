import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

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
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      const user = session?.user ?? null
      const profile = await fetchProfile(user?.id)
      set({ session, user, profile, loading: false })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) return { error }
    set({ user: null, profile: null, session: null })
    return {}
  },
}))
