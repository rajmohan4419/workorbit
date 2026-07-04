import { supabase } from '../supabase'

export const projectService = {
  async fetchProjects(workspaceId) {
    return await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
  },

  async createProject({ name, description, owner_id, workspace_id }) {
    return await supabase
      .from('projects')
      .insert([{ name, description, owner_id, workspace_id }])
      .select()
      .single()
  },

  async updateProject(id, updates) {
    return await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  },

  async deleteProject(id) {
    return await supabase.from('projects').delete().eq('id', id)
  },

  async fetchMembers(projectId) {
    return await supabase
      .from('project_members')
      .select('*, profiles!project_members_user_id_fkey(*)')
      .eq('project_id', projectId)
  },

  async fetchInvites(projectId) {
    return await supabase
      .from('project_invites')
      .select('*')
      .eq('project_id', projectId)
  },

  async createInvite(projectId, email, role) {
    const { data, error } = await supabase
      .from('project_invites')
      .insert([{ project_id: projectId, email, role }])
      .select()
      .single()

    if (!error && data) {
      // Trigger invitation email
      supabase.functions.invoke('invite-member', {
        body: { inviteId: data.id, type: 'project' }
      }).catch(err => {
        console.error('Error sending project invitation email:', err)
      })
    }

    return { data, error }
  },

  async deleteInvite(id) {
    return await supabase.from('project_invites').delete().eq('id', id)
  },

  async acceptInvite(inviteId, userId) {
    const { data: invite, error: fetchError } = await supabase
      .from('project_invites')
      .select('*')
      .eq('id', inviteId)
      .single()

    if (fetchError) return { error: fetchError }

    const { error: memberError } = await supabase
      .from('project_members')
      .upsert([{ project_id: invite.project_id, user_id: userId }], { onConflict: 'project_id, user_id' })

    if (memberError) return { error: memberError }

    await supabase.from('project_invites').delete().eq('id', inviteId)

    return { projectId: invite.project_id }
  }
}
