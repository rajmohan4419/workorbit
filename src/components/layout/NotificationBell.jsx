import { useState, useEffect, useMemo } from 'react'
import { Bell, Check, Circle, CheckCircle2, Calendar, ShieldCheck, MessageSquare, UserPlus, Trash2, Settings } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { useProjectStore } from '../../store/projectStore'
import { Link, useNavigate } from 'react-router-dom'

const CATEGORIES = {
  all: { label: 'All', types: [] },
  assignment: { label: 'Assignments', types: ['task_assignment'] },
  mention: { label: 'Mentions', types: ['task_mention'] },
  comment: { label: 'Comments', types: ['new_comment'] },
  due_date: { label: 'Due Dates', types: ['due_date_change'] },
  workspace: { label: 'Workspace', types: ['role_change', 'workspace_invite', 'project_invite'] },
  system: { label: 'System', types: ['task_completed'] }
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const notifications = useNotificationStore((state) => state.notifications)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const markAsRead = useNotificationStore((state) => state.markAsRead)
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead)
  const deleteNotification = useNotificationStore((state) => state.deleteNotification)
  const acceptInvite = useProjectStore((state) => state.acceptInvite)
  const fetchProjects = useProjectStore((state) => state.fetchProjects)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'all') return notifications
    return notifications.filter(n => CATEGORIES[activeCategory].types.includes(n.type))
  }, [notifications, activeCategory])

  const getIcon = (type) => {
    switch (type) {
      case 'task_completed': return <CheckCircle2 size={14} className="text-emerald-500" />
      case 'due_date_change': return <Calendar size={14} className="text-amber-500" />
      case 'role_change': return <ShieldCheck size={14} className="text-indigo-500" />
      case 'task_assignment': return <UserPlus size={14} className="text-blue-500" />
      case 'new_comment':
      case 'task_mention': return <MessageSquare size={14} className="text-purple-500" />
      default: return <Bell size={14} className="text-gray-400" />
    }
  }

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
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => {
                    navigate('/settings/notifications')
                    setIsOpen(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>

            <div className="px-2 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto no-scrollbar bg-white">
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                    activeCategory === key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
              {filteredNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 relative group ${!notification.read ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="pt-1 flex-shrink-0 flex flex-col items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
                        {getIcon(notification.type)}
                      </div>
                      {!notification.read && (
                        <Circle size={6} className="fill-indigo-500 text-indigo-500" />
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
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="Mark as read"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
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
                                navigate(`/projects/${projectId}`)
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
            
          </div>
        </>
      )}
    </div>
  )
}
