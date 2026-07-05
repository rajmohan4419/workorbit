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
        projects(name, workspaces(slug)),
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
    // Fetch old state to avoid redundant notifications
    const { data: oldTask } = await supabase.from('tasks').select('assigned_to').eq('id', id).single()

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data && updates.assigned_to && updates.assigned_to !== oldTask?.assigned_to) {
      // Trigger email for new assignment
      supabase.functions.invoke('task-notifications', {
        body: { type: 'assignment', taskId: id, userId: updates.assigned_to }
      }).catch(console.error)
    }

    return { data, error }
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
    const { data, error } = await supabase
      .from('task_comments')
      .insert([{ task_id: taskId, content }])
      .select('*, profiles!task_comments_user_id_fkey(full_name, avatar_path)')
      .single()

    if (!error && data && content.includes('@')) {
      // Find mentioned users (simplified: search profiles by name)
      // In a real app, this would be more robust.
      const mentions = content.match(/@(\w+)/g) || []
      for (const mention of mentions) {
        const name = mention.substring(1)
        supabase.from('profiles').select('id').ilike('full_name', `%${name}%`).limit(1).then(({ data: users }) => {
          if (users && users[0]) {
            supabase.functions.invoke('task-notifications', {
              body: { type: 'mention', taskId, userId: users[0].id, content }
            }).catch(console.error)
          }
        })
      }
    }

    return { data, error }
  },

  async deleteComment(id) {
    return await supabase.from('task_comments').delete().eq('id', id)
  },

  async updateComment(id, content) {
    return await supabase
      .from('task_comments')
      .update({ content })
      .eq('id', id)
      .select('*, profiles!task_comments_user_id_fkey(full_name, avatar_path)')
      .single()
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
  },

  async getTaskCount() {
    return await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
  },

  async uploadAttachment(filePath, file) {
    return await supabase.storage
      .from('task-attachments')
      .upload(filePath, file)
  },

  async removeAttachment(filePath) {
    return await supabase.storage.from('task-attachments').remove([filePath])
  },

  async searchAll(query) {
    const q = `%${query}%`

    const [tasks, projects] = await Promise.all([
      supabase
        .from('tasks')
        .select(`
          *,
          projects(name, workspaces(slug)),
          profiles!tasks_assigned_to_fkey(full_name, avatar_path)
        `)
        .or(`title.ilike.${q},description.ilike.${q}`)
        .limit(10),
      supabase
        .from('projects')
        .select('*, workspaces(slug)')
        .or(`name.ilike.${q},description.ilike.${q}`)
        .limit(5)
    ])

    return {
      tasks: tasks.data || [],
      projects: projects.data || []
    }
  }
}
