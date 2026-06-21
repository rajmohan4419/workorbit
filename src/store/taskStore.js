import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const STATUSES = ['todo', 'in_progress', 'in_review', 'done']
export const STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
}
export const PRIORITIES = ['low', 'medium', 'high']
export const NEXT_STATUS = {
  todo: 'in_progress',
  in_progress: 'in_review',
  in_review: 'done',
  done: null,
}

export const canMoveToStatus = (from, to) => {
  const fromIndex = STATUSES.indexOf(from)
  const toIndex = STATUSES.indexOf(to)
  return fromIndex !== -1 && toIndex !== -1 && Math.abs(fromIndex - toIndex) === 1
}

export const useTaskStore = create((set, get) => ({
  tasks: [],
  searchResults: [],
  comments: [],
  logs: [],
  subtasks: [],
  attachments: [],
  timeLogs: [],
  labels: [],
  projectLabels: [],
  loading: false,
  error: null,

  reset: () => set({
    tasks: [],
    searchResults: [],
    comments: [],
    logs: [],
    subtasks: [],
    attachments: [],
    timeLogs: [],
    labels: [],
    projectLabels: [],
    loading: false,
    error: null,
  }),

  fetchTasks: async (projectId) => {
    if (!projectId) {
      set({ tasks: [], loading: false, error: null })
      return { data: [] }
    }

    set({ tasks: [], loading: true, error: null })
    const { data, error } = await supabase
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

    if (error) {
      set({ tasks: [], error: error.message, loading: false })
      return { error }
    }

    set({ tasks: data, error: null, loading: false })
    return { data }
  },

  fetchAllUserTasks: async (userId) => {
    if (!userId) {
      set({ tasks: [], loading: false, error: null })
      return { data: [] }
    }

    set({ tasks: [], loading: true, error: null })
    const { data, error } = await supabase
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

    if (error) {
      set({ tasks: [], error: error.message, loading: false })
      return { error }
    }

    set({ tasks: data, error: null, loading: false })
    return { data }
  },

  fetchGlobalTasks: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
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

    if (error) {
      set({ error: error.message, loading: false })
      return { error }
    }

    set({ searchResults: data, loading: false })
    return { data }
  },

  getTaskCount: async () => {
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
    if (error) return 0
    return count
  },

  createTask: async ({ title, description, status, priority, due_date, project_id, assigned_to }) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, description, status: status, priority: priority || 'medium', due_date, project_id, assigned_to }])
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({ tasks: [...state.tasks, data], error: null }))
    return { data }
  },

  updateTask: async (id, updates) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? data : t)),
      error: null,
    }))
    return { data }
  },

  moveTask: async (id, newStatus) => {
    const previousTasks = get().tasks
    const currentTask = previousTasks.find((task) => task.id === id)

    if (!currentTask) return { error: { message: 'Task not found' } }

    if (!canMoveToStatus(currentTask.status, newStatus)) {
      const error = { message: 'Invalid status transition.' }
      set({ error: error.message })
      return { error }
    }

    // Optimistic update (Immediate UI feedback)
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
      error: null,
    }))

    // Background update (Non-blocking)
    supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          // Rollback if request fails
          set({ tasks: previousTasks, error: error.message })
        } else {
          // Sync with server data (handles database triggers, e.g. activity logs)
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? data : t)),
            error: null,
          }))
        }
      })

    return { data: { ...currentTask, status: newStatus } }
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      error: null,
    }))

    return {}
  },

  fetchComments: async (taskId) => {
    set({ comments: [] })
    const { data, error } = await supabase
      .from('task_comments')
      .select('*, profiles!task_comments_user_id_fkey(full_name, avatar_path)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) return { error }
    set({ comments: data })
    return { data }
  },

  addComment: async (taskId, content) => {
    const { data, error } = await supabase
      .from('task_comments')
      .insert([{ task_id: taskId, content }])
      .select('*, profiles!task_comments_user_id_fkey(full_name, avatar_path)')
      .single()

    if (error) return { error }
    set((state) => ({ comments: [...state.comments, data] }))
    return { data }
  },

  deleteComment: async (id) => {
    const { error } = await supabase.from('task_comments').delete().eq('id', id)
    if (error) return { error }
    set((state) => ({ comments: state.comments.filter((c) => c.id !== id) }))
    return {}
  },

  fetchLogs: async (taskId) => {
    set({ logs: [] })
    const { data, error } = await supabase
      .from('task_logs')
      .select('*, profiles!task_logs_user_id_fkey(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) return { error }
    set({ logs: data })
    return { data }
  },

  fetchSubtasks: async (taskId) => {
    const { data, error } = await supabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) return { error }
    set({ subtasks: data })
    return { data }
  },

  addSubtask: async (taskId, title) => {
    const { data, error } = await supabase
      .from('task_subtasks')
      .insert([{ task_id: taskId, title }])
      .select()
      .single()

    if (error) return { error }
    set((state) => ({ subtasks: [...state.subtasks, data] }))
    return { data }
  },

  toggleSubtask: async (id, isCompleted) => {
    const { data, error } = await supabase
      .from('task_subtasks')
      .update({ is_completed: isCompleted })
      .eq('id', id)
      .select()
      .single()

    if (error) return { error }
    set((state) => ({
      subtasks: state.subtasks.map((s) => (s.id === id ? data : s)),
    }))
    return { data }
  },

  deleteSubtask: async (id) => {
    const { error } = await supabase.from('task_subtasks').delete().eq('id', id)
    if (error) return { error }
    set((state) => ({
      subtasks: state.subtasks.filter((s) => s.id !== id),
    }))
    return {}
  },

  fetchAttachments: async (taskId) => {
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) return { error }
    set({ attachments: data })
    return { data }
  },

  uploadAttachment: async (taskId, file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${taskId}/${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file)

    if (uploadError) return { error: uploadError }

    const { data, error } = await supabase
      .from('task_attachments')
      .insert([{
        task_id: taskId,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type
      }])
      .select()
      .single()

    if (error) return { error }
    set((state) => ({ attachments: [data, ...state.attachments] }))
    return { data }
  },

  deleteAttachment: async (id, filePath) => {
    await supabase.storage.from('task-attachments').remove([filePath])
    const { error } = await supabase.from('task_attachments').delete().eq('id', id)
    if (error) return { error }
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== id),
    }))
    return {}
  },

  fetchTimeLogs: async (taskId) => {
    const { data, error } = await supabase
      .from('time_logs')
      .select('*, profiles!time_logs_user_id_fkey(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) return { error }
    set({ timeLogs: data })
    return { data }
  },

  addTimeLog: async (taskId, durationSeconds, description) => {
    const { data, error } = await supabase
      .from('time_logs')
      .insert([{ task_id: taskId, duration_seconds: durationSeconds, description }])
      .select('*, profiles!time_logs_user_id_fkey(full_name)')
      .single()

    if (error) return { error }
    set((state) => ({ timeLogs: [data, ...state.timeLogs] }))
    return { data }
  },

  subscribeToProject: (projectId) => {
    const channel = supabase
      .channel(`project-updates-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const { data } = await supabase
            .from('tasks')
            .select(`
              *,
              profiles!tasks_assigned_to_fkey(id, full_name, avatar_path),
              task_subtasks(id, is_completed),
              task_comments(count),
              task_attachments(count),
              task_labels(labels(*))
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            set((state) => {
              const taskExists = state.tasks.find((t) => t.id === data.id)
              if (payload.eventType === 'INSERT' && !taskExists) {
                return { tasks: [...state.tasks, data] }
              }
              return {
                tasks: state.tasks.map((t) => (t.id === data.id ? data : t)),
              }
            })
          }
        } else if (payload.eventType === 'DELETE') {
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== payload.old.id),
          }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  fetchProjectLabels: async (projectId) => {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('project_id', projectId)

    if (error) return { error }
    set({ projectLabels: data })
    return { data }
  },

  fetchTaskLabels: async (taskId) => {
    const { data, error } = await supabase
      .from('task_labels')
      .select('*, labels(*)')
      .eq('task_id', taskId)

    if (error) return { error }
    const labels = data.map((tl) => tl.labels)
    set({ labels })
    return { data: labels }
  },

  addTaskLabel: async (taskId, labelId) => {
    const { error } = await supabase
      .from('task_labels')
      .insert([{ task_id: taskId, label_id: labelId }])

    if (error) return { error }
    // Refresh task labels
    return get().fetchTaskLabels(taskId)
  },

  removeTaskLabel: async (taskId, labelId) => {
    const { error } = await supabase
      .from('task_labels')
      .delete()
      .eq('task_id', taskId)
      .eq('label_id', labelId)

    if (error) return { error }
    set((state) => ({
      labels: state.labels.filter((l) => l.id !== labelId),
    }))
    return {}
  },

  createLabel: async (projectId, name, color) => {
    const { data, error } = await supabase
      .from('labels')
      .insert([{ project_id: projectId, name, color }])
      .select()
      .single()

    if (error) return { error }
    set((state) => ({
      projectLabels: [...state.projectLabels, data],
    }))
    return { data }
  },
}))
