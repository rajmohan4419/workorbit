import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { workspaceService } from '../../lib/services/workspaceService'
import { projectService } from '../../lib/services/projectService'
import { Loader2, AlertCircle } from 'lucide-react'
import { analyticsService } from '../../lib/services/analyticsService'

export default function PendingInviteHandler() {
  const user = useAuthStore((state) => state.user)
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (!user) return

    const checkInvites = async () => {
      const storedInvite = localStorage.getItem('pendingInvite')
      if (storedInvite) {
        try {
          const { inviteId, type } = JSON.parse(storedInvite)
          setProcessing(true)
          setErrorMessage(null)

          const result = type === 'workspace'
            ? await workspaceService.acceptInvite(inviteId, user.id)
            : type === 'project'
              ? await projectService.acceptInvite(inviteId, user.id)
              : { error: { message: 'Unknown invite type.' } }

          // acceptInvite() resolves with { error } instead of throwing, so a
          // failed acceptance (expired invite, RLS denial, etc.) must be
          // checked explicitly. Previously this result was never inspected,
          // so a failed acceptance still deleted the pending invite and
          // reloaded the page as if it had succeeded — silently discarding
          // the invite with no feedback to the user.
          if (result?.error) {
            setErrorMessage(result.error.message || 'Could not accept the invitation.')
            setProcessing(false)
            return
          }

          analyticsService.track('Invite Accepted', {
            type,
            inviteId,
            userId: user.id,
            workspaceId: result?.workspaceId,
            projectId: result?.projectId,
          })

          localStorage.removeItem('pendingInvite')
          window.location.reload() // Reload to refresh workspace/project list
        } catch (err) {
          console.error('Error processing pending invite:', err)
          setErrorMessage('Something went wrong while accepting the invitation.')
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

  if (errorMessage) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-red-100 shadow-xl rounded-2xl p-4 flex items-start gap-3 z-[100] max-w-sm animate-in slide-in-from-right-4">
        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertCircle size={16} className="text-red-600" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-gray-900">Couldn't join</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{errorMessage}</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('pendingInvite')
            setErrorMessage(null)
          }}
          className="text-gray-300 hover:text-gray-500 text-xs flex-shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    )
  }

  return null
}