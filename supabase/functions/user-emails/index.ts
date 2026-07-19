import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { logToGrafana } from "../_shared/logger.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      await logToGrafana('warn', 'user-emails', 'Rejected: no authorization header', {})
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // authClient runs as the caller (RLS-scoped) purely to validate their JWT.
    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: callerAuthError } = await authClient.auth.getUser()
    if (callerAuthError || !caller) {
      await logToGrafana('warn', 'user-emails', 'Rejected: invalid token', { error: callerAuthError?.message })
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Admin client to bypass RLS and perform database lookups
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { type, email, name, userId, senderName, taskTitle, dueDate, projectName, workspaceSlug, projectId } = body

    await logToGrafana('info', 'user-emails', 'Processing email request', { type, userId, email })

    let recipientEmail = email
    let recipientName = name || 'there'

    // If userId is provided, look up user details
    if (userId) {
      // 1. Fetch profile full_name
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

      if (!profileError && profile) {
        recipientName = profile.full_name
      }

      // 2. Fetch email using Admin auth client
      const { data: { user: targetUser }, error: authError } = await supabaseClient.auth.admin.getUserById(userId)
      if (!authError && targetUser?.email) {
        recipientEmail = targetUser.email
      }
    }

    // Fallback to caller's details if we still don't have email
    if (!recipientEmail) {
      recipientEmail = caller.email
      if (recipientName === 'there') {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', caller.id)
          .single()
        if (profile?.full_name) {
          recipientName = profile.full_name
        }
      }
    }

    if (!recipientEmail) {
      throw new Error('No recipient email available')
    }

    const EMAIL_API_KEY = Deno.env.get('RESEND_API_KEY')
    const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'OrbitBoard <notifications@orbitboard.in>'

    if (!EMAIL_API_KEY) {
      await logToGrafana('error', 'user-emails', 'Email API key not configured', {})
      throw new Error('Email service not configured')
    }

    let subject = ''
    let bodyHtml = ''
    let ctaLink = ''
    let ctaText = 'Explore OrbitBoard'

    // Determine absolute base URL
    const isLocal = req.headers.get('host')?.includes('localhost') || false
    const baseUrl = isLocal ? 'http://localhost:5173' : 'https://app.orbitboard.in'

    if (type === 'welcome') {
      subject = 'Welcome to OrbitBoard! 🚀'
      bodyHtml = `
        <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">
          Hi <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Welcome to <strong>OrbitBoard</strong>! We are absolutely thrilled to have you on board.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          OrbitBoard is a high-performance project management application designed to supercharge your team's productivity and streamline collaboration seamlessly.
        </p>

        <h3 style="color: #1E293B; font-size: 18px; font-weight: 700; margin-top: 32px; margin-bottom: 16px; border-left: 4px solid #10B981; padding-left: 12px;">
          Explore Your Superpowers on OrbitBoard:
        </h3>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px 0; vertical-align: top; width: 40px;">
              <div style="background-color: #EFF6FF; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 16px; line-height: 32px;">📋</div>
            </td>
            <td style="padding: 12px 0; padding-left: 12px; vertical-align: top;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1E293B;">Interactive Kanban Boards</h4>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.4;">Smooth drag-and-drop workflow tracking to organize tasks into columns like To Do, In Progress, In Review, and Done.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; vertical-align: top; width: 40px;">
              <div style="background-color: #EFF6FF; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 16px; line-height: 32px;">🏢</div>
            </td>
            <td style="padding: 12px 0; padding-left: 12px; vertical-align: top;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1E293B;">Multiple Workspaces & Projects</h4>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.4;">Isolate and streamline your personal tasks, company operations, client deliverables, and open-source contributions.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; vertical-align: top; width: 40px;">
              <div style="background-color: #EFF6FF; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 16px; line-height: 32px;">⏳</div>
            </td>
            <td style="padding: 12px 0; padding-left: 12px; vertical-align: top;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1E293B;">Timeline & Critical Path Analysis</h4>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.4;">Identify bottlenecks dynamically by tracking task dependencies, critical paths, and zero-slack deadlines.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; vertical-align: top; width: 40px;">
              <div style="background-color: #EFF6FF; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 16px; line-height: 32px;">💬</div>
            </td>
            <td style="padding: 12px 0; padding-left: 12px; vertical-align: top;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1E293B;">Rich Task Collaboration</h4>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.4;">Attach files securely, log time tracking, break down checklists, and discuss tasks with real-time @mentions highlighting.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; vertical-align: top; width: 40px;">
              <div style="background-color: #EFF6FF; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 16px; line-height: 32px;">🔔</div>
            </td>
            <td style="padding: 12px 0; padding-left: 12px; vertical-align: top;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1E293B;">Notification Center</h4>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.4;">Stay instantly updated about assignments, mentions, workspace role changes, and due date alerts.</p>
            </td>
          </tr>
        </table>
      `
      ctaLink = `${baseUrl}/`
      ctaText = 'Get Started on Your Board'
    } else if (type === 'nudge') {
      const activeSender = senderName || 'A teammate'
      subject = `Quick nudge from ${activeSender} at OrbitBoard 🔔`
      bodyHtml = `
        <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">
          Hi <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Your teammate <strong>${activeSender}</strong> has sent you a quick nudge to check in on OrbitBoard!
        </p>
        <div style="margin: 28px 0; padding: 20px; background-color: #EFF6FF; border-left: 4px solid #2563EB; border-radius: 0 12px 12px 0;">
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1E293B;">What should you do?</p>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #475569; line-height: 1.5;">
            Jump back into your active workspaces to complete assigned tasks, post project status updates, or reply to team comments. Keep up the great work!
          </p>
        </div>
      `
      ctaLink = `${baseUrl}/`
      ctaText = 'Jump to Your Workspace'
    } else if (type === 'we-miss-you') {
      subject = 'We miss you at OrbitBoard! 🌟'
      bodyHtml = `
        <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">
          Hi <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          We've noticed you haven't logged into OrbitBoard in a while, and we really miss having you!
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Our development team has been shipping incredible new features and productivity improvements designed to make managing your projects smoother than ever:
        </p>
        <div style="margin: 24px 0; padding: 20px; background-color: #F0FDF4; border-left: 4px solid #10B981; border-radius: 0 12px 12px 0;">
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #166534;">Check out what is new:</p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #1E293B; line-height: 1.6;">
            <li>⚡ Interactive micro-animations for lightning-fast responsiveness</li>
            <li>📊 Custom action metrics and team workload analysis dashboard</li>
            <li>💬 Optimistic comments UI with smart, highlighted @mentions</li>
            <li>🛡️ Hardened workspace security and complete RLS database isolation</li>
          </ul>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          We would love to help you and your team stay perfectly organized. Let's build something great together!
        </p>
      `
      ctaLink = `${baseUrl}/`
      ctaText = 'Return to OrbitBoard'
    } else if (type === 'overdue') {
      const activeTask = taskTitle || 'Assigned task'
      const activeProject = projectName || 'Active Project'
      const activeDueDate = dueDate || 'Passed deadline'
      subject = `[Overdue Alert] Task past due: ${activeTask} ⏰`
      bodyHtml = `
        <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">
          Hi <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          This is an alert that your assigned task <strong>"${activeTask}"</strong> is past its scheduled due date.
        </p>
        <div style="margin: 24px 0; padding: 20px; background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 0 12px 12px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; font-weight: 700; color: #475569; width: 110px; vertical-align: top;">Task Title:</td>
              <td style="padding: 6px 0; color: #991B1B; font-weight: 700; vertical-align: top;">${activeTask}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569; width: 110px; vertical-align: top;">Project:</td>
              <td style="padding: 6px 0; color: #1E293B; vertical-align: top;">${activeProject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569; width: 110px; vertical-align: top;">Due Date:</td>
              <td style="padding: 6px 0; color: #B91C1C; font-weight: 700; vertical-align: top;">${activeDueDate}</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Please review this task to update its progress, complete any pending items, or schedule a revised deadline to keep the project on track.
        </p>
      `
      if (workspaceSlug && projectId) {
        ctaLink = `${baseUrl}/workspaces/${workspaceSlug}/projects/${projectId}`
      } else {
        ctaLink = `${baseUrl}/`
      }
      ctaText = 'View Task Details'
    } else {
      throw new Error(`Unsupported email type: ${type}`)
    }

    const compiledHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 40px 20px; min-height: 100%; width: 100%; box-sizing: border-box; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          <!-- Brand Header -->
          <div style="background-color: #2563EB; padding: 32px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 800; tracking-tight: -0.025em; font-family: sans-serif;">OrbitBoard</h1>
            <p style="color: #93C5FD; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Manage your work, your way</p>
          </div>
          <!-- Body -->
          <div style="padding: 40px 32px; color: #1E293B;">
            ${bodyHtml}

            ${ctaLink ? `
            <div style="margin: 32px 0; text-align: center;">
              <a href="${ctaLink}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                ${ctaText}
              </a>
            </div>` : ''}
          </div>
          <!-- Footer -->
          <div style="background-color: #F1F5F9; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
              You received this email because you are registered on OrbitBoard.
            </p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #94A3B8;">
              &copy; ${new Date().getFullYear()} OrbitBoard. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [recipientEmail],
        subject,
        html: compiledHtml,
      }),
    })

    const result = await response.json()
    await logToGrafana('info', 'user-emails', 'Email sent successfully', { type, recipientEmail })
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    await logToGrafana('error', 'user-emails', 'Unhandled function error', { error: error.message })
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
