import { supabase } from '../supabase'

export const sprintService = {
  async fetchSprints(projectId) {
    return await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: false })
  },

  async createSprint(sprintData) {
    return await supabase
      .from('sprints')
      .insert([sprintData])
      .select()
      .single()
  },

  async updateSprint(id, updates) {
    return await supabase
      .from('sprints')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  },

  async deleteSprint(id) {
    return await supabase.from('sprints').delete().eq('id', id)
  }
}
