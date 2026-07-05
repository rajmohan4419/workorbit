import { create } from 'zustand'
import { authService } from '../lib/services/authService'
import { notificationService } from '../lib/services/notificationService'

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  preferences: null,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true })
    const { data, error } = await notificationService.fetchNotifications()

    if (error) return { error }
    
    set({ 
      notifications: data, 
      unreadCount: data.filter(n => !n.read).length,
      loading: false 
    })
    return { data }
  },

  markAsRead: async (id) => {
    const { error } = await notificationService.markAsRead(id)

    if (error) return { error }
    
    set((state) => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }))
    return {}
  },

  markAllAsRead: async () => {
    const { data: { user } } = await authService.getUser()
    if (!user) return { error: { message: 'Not authenticated' } }

    const { error } = await notificationService.markAllAsRead(user.id)

    if (error) return { error }
    
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }))
    return {}
  },

  deleteNotification: async (id) => {
    const { error } = await notificationService.deleteNotification(id)
    if (error) return { error }

    set((state) => {
      const notification = state.notifications.find(n => n.id === id)
      return {
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: notification && !notification.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      }
    })
    return {}
  },

  updatePreferences: async (preferences) => {
    const { data: { user } } = await authService.getUser()
    if (!user) return { error: { message: 'Not authenticated' } }

    const { error } = await notificationService.updatePreferences(user.id, preferences)
    if (error) return { error }

    set({ preferences })
    return {}
  }
}))
