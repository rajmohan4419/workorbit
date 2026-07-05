import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { workspaceService } from '../../lib/services/workspaceService'
import { projectService } from '../../lib/services/projectService'
import { Loader2 } from 'lucide-react'

export default function PendingInviteHandler() {
  const user = useAuthStore((state) => state.user)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!user) return

    const checkInvites = async () => {
      const storedInvite = localStorage.getItem('pendingInvite')
      if (storedInvite) {
        try {
          const { inviteId, type } = JSON.parse(storedInvite)
          setProcessing(true)
          if (type === 'workspace') {
            await workspaceService.acceptInvite(inviteId, user.id)
          } else if (type === 'project') {
            await projectService.acceptInvite(inviteId, user.id)
          }
          localStorage.removeItem('pendingInvite')
          window.location.reload() // Reload to refresh workspace/project list
        } catch (err) {
          console.error('Error processing pending invite:', err)
        } finally {
          setProcessing(false)
        }
      }
    }

    checkInvites()
  }, [user])

  if (processing) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-100 shadow-xl rounded-2xl p-4 flex items-center gap-3 z-[100] animate-in slide-in-from-right-4">
        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Loader2 size={16} className="text-indigo-600 animate-spin" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">Joining workspace...</p>
          <p className="text-[10px] text-gray-400">Please wait a moment</p>
        </div>
      </div>
    )
  }

  return null
}
