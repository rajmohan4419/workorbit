import { supabase } from '../supabase'

export const workspaceService = {
  async fetchWorkspaces() {
    return await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false })
  },

  async getWorkspaceBySlug(slug) {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) return { error }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: workspace } // Still return workspace if RLS permits (though RLS should handle auth)

    // Role detection still needed for UI/Permissions, but we rely on RLS for the actual data access
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle()

    const isOwner = workspace.owner_id === user.id

    return { data: workspace, role: isOwner ? 'owner' : member?.role }
  },

  async fetchMembers(workspaceId) {
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()

    if (wsError) return { error: wsError }

    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('*, profiles!workspace_members_user_id_fkey(*)')
      .eq('workspace_id', workspaceId)

    if (membersError) return { error: membersError }

    const isOwnerInMembers = members.some(m => m.user_id === workspace.owner_id)

    if (!isOwnerInMembers) {
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', workspace.owner_id)
        .single()

      if (!ownerError && ownerProfile) {
        members.push({
          workspace_id: workspaceId,
          user_id: workspace.owner_id,
          role: 'owner',
          profiles: ownerProfile
        })
      }
    }

    return { data: members }
  },

  async updateWorkspace(workspaceId, updates) {
    return await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .select()
      .single()
  },

  async deleteWorkspace(workspaceId) {
    return await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)
  },

  async updateMemberRole(workspaceId, userId, role) {
    return await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
  },

  async removeMember(workspaceId, userId) {
    return await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
  },

  async transferOwnership(workspaceId, newOwnerId) {
    return await supabase
      .from('workspaces')
      .update({ owner_id: newOwnerId })
      .eq('id', workspaceId)
  },

  async fetchInvites(workspaceId) {
    return await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
  },

  async createInvite(workspaceId, email, role) {
    const { data, error } = await supabase
      .from('workspace_invites')
      .insert([{ workspace_id: workspaceId, email, role }])
      .select()
      .single()

    if (!error && data) {
      // Trigger invitation email
      supabase.functions.invoke('invite-member', {
        body: { inviteId: data.id, type: 'workspace' }
      })
    }

    return { data, error }
  },

  async deleteInvite(id) {
    return await supabase.from('workspace_invites').delete().eq('id', id)
  },

  async acceptInvite(inviteId, userId) {
    const { data: invite, error: fetchError } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('id', inviteId)
      .single()

    if (fetchError) return { error: fetchError }

    const { error: memberError } = await supabase
      .from('workspace_members')
      .upsert([{ workspace_id: invite.workspace_id, user_id: userId, role: invite.role }], { onConflict: 'workspace_id, user_id' })

    if (memberError) return { error: memberError }

    await supabase.from('workspace_invites').delete().eq('id', inviteId)

    return { workspaceId: invite.workspace_id }
  }
}
