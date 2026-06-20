import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  init: () => {
    let active = true
    set({ loading: true })

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active) return

      if (error) {
        set({ session: null, user: null, loading: false })
        return
      }

      set({ session, user: session?.user ?? null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      set({ session, user: session?.user ?? null, loading: false })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) return { error }
    set({ user: null, session: null })
    return {}
  },
}))
