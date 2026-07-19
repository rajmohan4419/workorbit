import { create } from 'zustand'
import { authService } from '../lib/services/authService'
import { useWorkspaceStore } from './workspaceStore'
import { analyticsService } from '../lib/services/analyticsService'
import { supabase } from '../lib/supabase'

const checkUserAnalytics = (user) => {
  if (!user) return

  // 1. Check User Signed Up
  const signUpTrackedKey = `signup_tracked_${user.id}`
  const userCreatedAt = new Date(user.created_at).getTime()
  const fiveMinutesMs = 5 * 60 * 1000
  const nowMs = Date.now()

  if (nowMs - userCreatedAt < fiveMinutesMs && !localStorage.getItem(signUpTrackedKey)) {
    analyticsService.track('User Signed Up', { userId: user.id, email: user.email })
    localStorage.setItem(signUpTrackedKey, 'true')

    // Trigger welcome email with features list on signup
    supabase.functions.invoke('user-emails', {
      body: {
        type: 'welcome',
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'there'
      }
    }).catch(err => console.error('[AuthStore] Error triggering welcome email:', err))
  }

  // 2. Check Email Verified
  if (user.email_confirmed_at) {
    const emailVerifiedTrackedKey = `email_verified_tracked_${user.id}`
    const emailConfirmedAt = new Date(user.email_confirmed_at).getTime()
    if (nowMs - emailConfirmedAt < fiveMinutesMs && !localStorage.getItem(emailVerifiedTrackedKey)) {
      analyticsService.track('Email Verified', { userId: user.id, email: user.email })
      localStorage.setItem(emailVerifiedTrackedKey, 'true')
    }
  }
}

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

    const handleProfileFetch = async (userId) => {
      if (!userId) return null
      const { data, error } = await authService.fetchProfile(userId)
      if (error) {
        console.error('Error fetching profile:', error.message)
        return null
      }
      return data
    }

    // Fetch initial session
    authService.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (!session) {
        set({ loading: false })
        return
      }

      const user = session.user
      checkUserAnalytics(user)
      handleProfileFetch(user.id).then(profile => {
        if (!active) return
        set({ session, user, profile, loading: false })
        useWorkspaceStore.getState().fetchWorkspaces()
      })
    })

    const { data: { subscription } } = authService.onAuthStateChange(async (_event, session) => {
      if (!active) return
      const user = session?.user ?? null

      if (user) {
        checkUserAnalytics(user)
      }

      try {
        const profile = await handleProfileFetch(user?.id)
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
    const { data: { user } } = await authService.getUser()
    const userId = user?.id
    if (!userId) return { error: { message: 'Not authenticated' } }

    const finalUpdates = { ...updates }
    if (updates.first_name || updates.last_name) {
      const currentProfile = get().profile
      const firstName = updates.first_name ?? currentProfile?.first_name ?? ''
      const lastName = updates.last_name ?? currentProfile?.last_name ?? ''
      finalUpdates.full_name = `${firstName} ${lastName}`.trim()
    }

    const { data, error } = await authService.updateProfile(userId, finalUpdates)

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
    const { error } = await authService.signOut()
    if (error) return { error }
    set({ user: null, profile: null, session: null })
    return {}
  },
}))
