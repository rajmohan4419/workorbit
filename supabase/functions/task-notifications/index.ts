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
      await logToGrafana('warn', 'task-notifications', 'Rejected: no authorization header', {})
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
      await logToGrafana('warn', 'task-notifications', 'Rejected: invalid token', { error: callerAuthError?.message })
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Admin client bypasses RLS for the actual lookups below — only reachable
    // now that we've confirmed the caller holds a valid session.
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const { type, taskId, userId, content } = await req.json()

    // Fetch Task Details
    const { data: task, error: taskError } = await supabaseClient
      .from('tasks')
      .select('*, projects(name, workspaces(slug))')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      await logToGrafana('error', 'task-notifications', 'Task not found', { taskId, callerId: caller.id })
      throw new Error('Task not found')
    }

    // Fetch Target User
    const { data: targetUser, error: userError } = await supabaseClient
      .from('profiles')
      .select('full_name, id')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      await logToGrafana('error', 'task-notifications', 'Target user not found', { userId, callerId: caller.id })
      throw new Error('User not found')
    }

    // Get user email from auth.users (requires service role)
    const { data: { user: authUser }, error: authError } = await supabaseClient.auth.admin.getUserById(userId)
    if (authError || !authUser?.email) {
      await logToGrafana('error', 'task-notifications', 'User email not found', { userId })
      throw new Error('User email not found')
    }

    const EMAIL_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!EMAIL_API_KEY) {
      await logToGrafana('error', 'task-notifications', 'Email API key not configured', {})
      throw new Error('Email service not configured')
    }

    let subject = ''
    let bodyHtml = ''

    if (type === 'assignment') {
      subject = `New task assigned: ${task.title}`
      bodyHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5;">OrbitBoard</h2>
          <p>Hello <strong>${targetUser.full_name}</strong>,</p>
          <p>A new task has been assigned to you: <strong>${task.title}</strong></p>
          <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Project: ${task.projects.name}</p>
            ${task.due_date ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #ef4444;">Due: ${task.due_date}</p>` : ''}
          </div>
          <a href="https://app.orbitboard.in/workspaces/${task.projects.workspaces.slug}/projects/${task.project_id}"
             style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Task
          </a>
        </div>
      `
    } else if (type === 'mention') {
      subject = `You were mentioned in OrbitBoard`
      bodyHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5;">OrbitBoard</h2>
          <p>Hello <strong>${targetUser.full_name}</strong>,</p>
          <p>You were mentioned in a comment on task: <strong>${task.title}</strong></p>
          <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #4f46e5; background: #f9fafb;">
            <p style="margin: 0; font-style: italic;">"${content}"</p>
          </div>
          <a href="https://app.orbitboard.in/workspaces/${task.projects.workspaces.slug}/projects/${task.project_id}"
             style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reply to Comment
          </a>
        </div>
      `
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'OrbitBoard <notifications@orbitboard.in>',
        to: [authUser.email],
        subject,
        html: bodyHtml,
      }),
    })

    const result = await response.json()
    await logToGrafana('info', 'task-notifications', 'Notification sent', { type, taskId })
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    await logToGrafana('error', 'task-notifications', 'Unhandled function error', { error: error.message })
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
