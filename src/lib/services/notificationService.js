import { supabase } from '../supabase'

export const notificationService = {
  async fetchNotifications() {
    return await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
  },

  async markAsRead(id) {
    return await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
  },

  async markAllAsRead(userId) {
    return await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  },

  async deleteNotification(id) {
    return await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
  },

  async updatePreferences(userId, preferences) {
    return await supabase
      .from('profiles')
      .update({ notification_preferences: preferences })
      .eq('id', userId)
  },

  async createNotification(notificationData) {
    return await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single()
  }
}
