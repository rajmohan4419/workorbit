import { supabase } from '../supabase'

export const taskService = {
  async fetchTasks(projectId) {
    return await supabase
      .from('tasks')
      .select(`
        *,
        profiles!tasks_assigned_to_fkey(id, full_name, avatar_path),
        task_subtasks(id, is_completed),
        task_comments(count),
        task_attachments(count),
        task_labels(labels(*))
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
  },

  async fetchAllUserTasks(userId) {
    return await supabase
      .from('tasks')
      .select(`
        *,
        projects(name),
        profiles!tasks_assigned_to_fkey(id, full_name, avatar_path),
        task_subtasks(id, is_completed),
        task_comments(count),
        task_attachments(count),
        task_labels(labels(*))
      `)
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true, nullsFirst: false })
  },

  async fetchGlobalTasks() {
    return await supabase
      .from('tasks')
      .select(`
        *,
        projects(name),
        profiles!tasks_assigned_to_fkey(id, full_name, avatar_path),
        task_subtasks(id, is_completed),
        task_comments(count),
        task_attachments(count),
        task_labels(labels(*))
      `)
      .order('created_at', { ascending: false })
  },

  async createTask(taskData) {
    return await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()
  },

  async updateTask(id, updates) {
    return await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  },

  async deleteTask(id) {
    return await supabase.from('tasks').delete().eq('id', id)
  },

  async fetchComments(taskId) {
    return await supabase
      .from('task_comments')
      .select('*, profiles!task_comments_user_id_fkey(full_name, avatar_path)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
  },

  async addComment(taskId, content) {
    return await supabase
      .from('task_comments')
      .insert([{ task_id: taskId, content }])
      .select('*, profiles!task_comments_user_id_fkey(full_name, avatar_path)')
      .single()
  },

  async deleteComment(id) {
    return await supabase.from('task_comments').delete().eq('id', id)
  },

  async fetchLogs(taskId) {
    return await supabase
      .from('task_logs')
      .select('*, profiles!task_logs_user_id_fkey(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
  },

  async fetchSubtasks(taskId) {
    return await supabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
  },

  async addSubtask(taskId, title) {
    return await supabase
      .from('task_subtasks')
      .insert([{ task_id: taskId, title }])
      .select()
      .single()
  },

  async updateSubtask(id, updates) {
    return await supabase
      .from('task_subtasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
  },

  async deleteSubtask(id) {
    return await supabase.from('task_subtasks').delete().eq('id', id)
  },

  async fetchAttachments(taskId) {
    return await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
  },

  async addAttachment(attachmentData) {
    return await supabase
      .from('task_attachments')
      .insert([attachmentData])
      .select()
      .single()
  },

  async deleteAttachment(id) {
    return await supabase.from('task_attachments').delete().eq('id', id)
  },

  async fetchTimeLogs(taskId) {
    return await supabase
      .from('time_logs')
      .select('*, profiles!time_logs_user_id_fkey(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
  },

  async addTimeLog(taskId, durationSeconds, description) {
    return await supabase
      .from('time_logs')
      .insert([{ task_id: taskId, duration_seconds: durationSeconds, description }])
      .select('*, profiles!time_logs_user_id_fkey(full_name)')
      .single()
  },

  async fetchProjectLabels(projectId) {
    return await supabase
      .from('labels')
      .select('*')
      .eq('project_id', projectId)
  },

  async fetchTaskLabels(taskId) {
    return await supabase
      .from('task_labels')
      .select('*, labels(*)')
      .eq('task_id', taskId)
  },

  async addTaskLabel(taskId, labelId) {
    return await supabase
      .from('task_labels')
      .insert([{ task_id: taskId, label_id: labelId }])
  },

  async removeTaskLabel(taskId, labelId) {
    return await supabase
      .from('task_labels')
      .delete()
      .eq('task_id', taskId)
      .eq('label_id', labelId)
  },

  async createLabel(projectId, name, color) {
    return await supabase
      .from('labels')
      .insert([{ project_id: projectId, name, color }])
      .select()
      .single()
  },

  // Dependencies
  async fetchDependencies(taskId) {
    return await supabase
      .from('task_dependencies')
      .select('*, depends_on:tasks!depends_on_id(*)')
      .eq('task_id', taskId)
  },

  async addDependency(taskId, dependsOnId) {
    return await supabase
      .from('task_dependencies')
      .insert([{ task_id: taskId, depends_on_id: dependsOnId }])
      .select()
      .single()
  },

  async removeDependency(taskId, dependsOnId) {
    return await supabase
      .from('task_dependencies')
      .delete()
      .eq('task_id', taskId)
      .eq('depends_on_id', dependsOnId)
  }
}
