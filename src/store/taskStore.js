import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { taskService } from '../lib/services/taskService'

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
  return fromIndex !== -1 && toIndex !== -1
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
    const { data, error } = await taskService.fetchTasks(projectId)

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
    const { data, error } = await taskService.fetchAllUserTasks(userId)

    if (error) {
      set({ tasks: [], error: error.message, loading: false })
      return { error }
    }

    set({ tasks: data, error: null, loading: false })
    return { data }
  },

  fetchGlobalTasks: async () => {
    set({ loading: true, error: null })
    const { data, error } = await taskService.fetchGlobalTasks()

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

  createTask: async (taskData) => {
    const { data, error } = await taskService.createTask(taskData)

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({ tasks: [...state.tasks, data], error: null }))
    return { data }
  },

  updateTask: async (id, updates) => {
    const { data, error } = await taskService.updateTask(id, updates)

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
    taskService.updateTask(id, { status: newStatus })
      .then(({ data, error }) => {
        if (error) {
          // Rollback only the affected task if request fails
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, status: currentTask.status } : t
            ),
            error: error.message
          }))
        } else {
          // Sync only relevant fields to avoid overwriting rich joined data with a flat object
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, status: newStatus, updated_at: data.updated_at } : t
            ),
            error: null,
          }))
        }
      })

    return { data: { ...currentTask, status: newStatus } }
  },

  deleteTask: async (id) => {
    const { error } = await taskService.deleteTask(id)
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
    const { data, error } = await taskService.fetchComments(taskId)

    if (error) return { error }
    set({ comments: data })
    return { data }
  },

  addComment: async (taskId, content) => {
    const { data, error } = await taskService.addComment(taskId, content)

    if (error) return { error }
    set((state) => ({ comments: [...state.comments, data] }))
    return { data }
  },

  deleteComment: async (id) => {
    const { error } = await taskService.deleteComment(id)
    if (error) return { error }
    set((state) => ({ comments: state.comments.filter((c) => c.id !== id) }))
    return {}
  },

  fetchLogs: async (taskId) => {
    set({ logs: [] })
    const { data, error } = await taskService.fetchLogs(taskId)

    if (error) return { error }
    set({ logs: data })
    return { data }
  },

  fetchSubtasks: async (taskId) => {
    const { data, error } = await taskService.fetchSubtasks(taskId)

    if (error) return { error }
    set({ subtasks: data })
    return { data }
  },

  addSubtask: async (taskId, title) => {
    const { data, error } = await taskService.addSubtask(taskId, title)

    if (error) return { error }
    set((state) => ({ subtasks: [...state.subtasks, data] }))
    return { data }
  },

  toggleSubtask: async (id, isCompleted) => {
    const { data, error } = await taskService.updateSubtask(id, { is_completed: isCompleted })

    if (error) return { error }
    set((state) => ({
      subtasks: state.subtasks.map((s) => (s.id === id ? data : s)),
    }))
    return { data }
  },

  deleteSubtask: async (id) => {
    const { error } = await taskService.deleteSubtask(id)
    if (error) return { error }
    set((state) => ({
      subtasks: state.subtasks.filter((s) => s.id !== id),
    }))
    return {}
  },

  fetchAttachments: async (taskId) => {
    const { data, error } = await taskService.fetchAttachments(taskId)

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

    const { data, error } = await taskService.addAttachment({
      task_id: taskId,
      name: file.name,
      file_path: filePath,
      file_size: file.size,
      content_type: file.type
    })

    if (error) return { error }
    set((state) => ({ attachments: [data, ...state.attachments] }))
    return { data }
  },

  deleteAttachment: async (id, filePath) => {
    await supabase.storage.from('task-attachments').remove([filePath])
    const { error } = await taskService.deleteAttachment(id)
    if (error) return { error }
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== id),
    }))
    return {}
  },

  fetchTimeLogs: async (taskId) => {
    const { data, error } = await taskService.fetchTimeLogs(taskId)

    if (error) return { error }
    set({ timeLogs: data })
    return { data }
  },

  addTimeLog: async (taskId, durationSeconds, description) => {
    const { data, error } = await taskService.addTimeLog(taskId, durationSeconds, description)

    if (error) return { error }
    set((state) => ({ timeLogs: [data, ...state.timeLogs] }))
    return { data }
  },

  subscribeToProject: (projectId) => {
    // Remove existing channel for this project if it exists to avoid collisions
    supabase.removeChannel(supabase.channel(`project-updates-${projectId}`))

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
    const { data, error } = await taskService.fetchProjectLabels(projectId)

    if (error) return { error }
    set({ projectLabels: data })
    return { data }
  },

  fetchTaskLabels: async (taskId) => {
    const { data, error } = await taskService.fetchTaskLabels(taskId)

    if (error) return { error }
    const labels = data.map((tl) => tl.labels)
    set({ labels })
    return { data: labels }
  },

  addTaskLabel: async (taskId, labelId) => {
    const { error } = await taskService.addTaskLabel(taskId, labelId)

    if (error) return { error }
    // Refresh task labels
    return get().fetchTaskLabels(taskId)
  },

  removeTaskLabel: async (taskId, labelId) => {
    const { error } = await taskService.removeTaskLabel(taskId, labelId)

    if (error) return { error }
    set((state) => ({
      labels: state.labels.filter((l) => l.id !== labelId),
    }))
    return {}
  },

  createLabel: async (projectId, name, color) => {
    const { data, error } = await taskService.createLabel(projectId, name, color)

    if (error) return { error }
    set((state) => ({
      projectLabels: [...state.projectLabels, data],
    }))
    return { data }
  },
}))
