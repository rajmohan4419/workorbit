import { supabase } from '../supabase'

export const authService = {
  async getSession() {
    return await supabase.auth.getSession()
  },

  async getUser() {
    return await supabase.auth.getUser()
  },

  async fetchProfile(userId) {
    if (!userId) return { data: null }
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  },

  async updateProfile(userId, updates) {
    return await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
  },

  async signOut() {
    return await supabase.auth.signOut()
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
