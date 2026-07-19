import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { logToGrafana, maskEmail } from "../_shared/logger.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? ''

    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Create an admin client to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Validate the JWT
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const body = await req.json()
    await logToGrafana('info', 'invite-member', 'Received request', {
      inviteId: body.inviteId,
      type: body.type,
      workspace_id: body.workspace_id,
      project_id: body.project_id,
      email: maskEmail(body.email),
    })

    let { inviteId, type, email, workspace_id, project_id } = body

    // Rate limiting: Check if user has sent too many invites recently
    const { count, error: countError } = await adminClient
      .from(type === 'workspace' || workspace_id ? 'workspace_invites' : 'project_invites')
      .select('*', { count: 'exact', head: true })
      .eq('invited_by', user.id)
      .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (!countError && count && count >= 20) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Auto-detect type if missing
    if (!type) {
      if (workspace_id) type = 'workspace'
      else if (project_id) type = 'project'
    }

    let invite = null
    const table = type === 'workspace' ? 'workspace_invites' : 'project_invites'

    if (inviteId) {
      // Fetch invite details by ID
      const { data, error } = await adminClient
        .from(table)
        .select('*')
        .eq('id', inviteId)
        .single()

      if (error || !data) {
        await logToGrafana('error', 'invite-member', 'Error fetching invite by ID', { inviteId, error: error?.message })
        throw new Error('Invitation not found')
      }
      invite = data
    } else if (email && (workspace_id || project_id)) {
      // Fetch invite details by Email and Entity ID
      const entityIdField = type === 'workspace' ? 'workspace_id' : 'project_id'
      const entityId = workspace_id || project_id

      const { data, error } = await adminClient
        .from(table)
        .select('*')
        .eq('email', email)
        .eq(entityIdField, entityId)
        .single()

      if (error || !data) {
        await logToGrafana('error', 'invite-member', 'Error fetching invite by email/entity', { email: maskEmail(email), entityId, error: error?.message })
        throw new Error('Invitation not found for the provided email and entity')
      }
      invite = data
      inviteId = invite.id // Ensure we have the ID for the link
    } else {
      // Throw the specific error reported by the user if neither ID nor correct email/ws_id pair provided
      if (type === 'workspace' || workspace_id) {
        throw new Error('email and workspace_id are required')
      } else if (type === 'project' || project_id) {
        throw new Error('email and project_id are required')
      }
      throw new Error('inviteId or (email and workspace_id/project_id) are required')
    }

    const entityTable = type === 'workspace' ? 'workspaces' : 'projects'
    const entityIdField = type === 'workspace' ? 'workspace_id' : 'project_id'

    // Fetch workspace/project details
    const { data: entity, error: entityError } = await adminClient
      .from(entityTable)
      .select('name')
      .eq('id', invite[entityIdField])
      .single()

    if (entityError || !entity) {
      await logToGrafana('error', 'invite-member', 'Error fetching entity', { entityTable, entityId: invite[entityIdField], error: entityError?.message })
      throw new Error(`${type === 'workspace' ? 'Workspace' : 'Project'} not found`)
    }

    // Fetch inviter details
    const { data: inviter, error: inviterError } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', invite.invited_by)
      .single()

    if (inviterError || !inviter) {
      await logToGrafana('warn', 'invite-member', 'Error fetching inviter, using fallback name', { invitedBy: invite.invited_by, error: inviterError?.message })
      // Fallback if inviter profile not found
    }

    const inviterName = inviter?.full_name || 'A team member'
    const inviteLink = `https://app.orbitboard.in/auth?inviteId=${inviteId}&type=${type}&email=${encodeURIComponent(invite.email)}`

    // Email Sending Logic (Configurable via Environment Variables)
    const EMAIL_API_KEY = Deno.env.get('RESEND_API_KEY')
    const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'OrbitBoard <notifications@orbitboard.in>'

    if (!EMAIL_API_KEY) {
      await logToGrafana('error', 'invite-member', 'Email API key not configured', {})
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [invite.email],
        subject: `You've been invited to join ${entity.name} on OrbitBoard`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
            <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin-bottom: 16px;">OrbitBoard</h1>
            <p style="font-size: 16px; color: #374151; line-height: 1.5;">
              Hello! <strong>${inviterName}</strong> has invited you to join the ${type} <strong>${entity.name}</strong> as a <strong>${invite.role}</strong>.
            </p>
            <div style="margin: 32px 0;">
              <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="margin: 32px 0; border: 0; border-top: 1px solid #e5e7eb;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              &copy; ${new Date().getFullYear()} OrbitBoard. All rights reserved.
            </p>
          </div>
        `,
      }),
    })

    const result = await response.json()

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    await logToGrafana('error', 'invite-member', 'Unhandled function error', { error: error.message })
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
