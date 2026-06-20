import { useState, useEffect } from 'react'
import { Bell, Check, Circle } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { useProjectStore } from '../../store/projectStore'
import { Link, useNavigate } from 'react-router-dom'

export default function NotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const notifications = useNotificationStore((state) => state.notifications)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const markAsRead = useNotificationStore((state) => state.markAsRead)
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead)
  const acceptInvite = useProjectStore((state) => state.acceptInvite)
  const fetchProjects = useProjectStore((state) => state.fetchProjects)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-[101] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${!notification.read ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="pt-1 flex-shrink-0">
                      {!notification.read ? (
                        <Circle size={8} className="fill-indigo-500 text-indigo-500" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium text-gray-900 ${!notification.read ? 'pr-6' : ''}`}>
                        {notification.title}
                      </p>
                      {notification.content && (
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notification.content}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400">
                          {new Date(notification.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            className="p-1 text-gray-300 hover:text-indigo-600 transition-colors"
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                      {notification.type === 'project_invite' && !notification.read && (
                        <div className="mt-3 flex gap-2">
                          <button
                            disabled={processing === notification.id}
                            onClick={async (e) => {
                              e.stopPropagation()
                              setProcessing(notification.id)
                              const { projectId, error } = await acceptInvite(notification.metadata?.inviteId)
                              setProcessing(null)
                              if (!error) {
                                await markAsRead(notification.id)
                                await fetchProjects()
                                navigate(`/project/${projectId}`)
                                setIsOpen(false)
                              }
                            }}
                            className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Accept
                          </button>
                        </div>
                      )}

                      {notification.link && (
                        <Link
                          to={notification.link}
                          onClick={() => {
                            setIsOpen(false)
                            markAsRead(notification.id)
                          }}
                          className="absolute inset-0 z-0"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
               <button className="text-[10px] font-medium text-gray-500 hover:text-gray-700">View all</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
