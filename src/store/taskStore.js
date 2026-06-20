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

export const canMoveToStatus = (from, to) => from === to || NEXT_STATUS[from] === to

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  reset: () => set({
    tasks: [],
    loading: false,
    error: null,
  }),

  fetchTasks: async (projectId) => {
    if (!projectId) {
      set({ tasks: [], loading: false, error: null })
      return { data: [] }
    }

    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      set({ tasks: [], error: error.message, loading: false })
      return { error }
    }

    set({ tasks: data, error: null, loading: false })
    return { data }
  },

  createTask: async ({ title, description, status, priority, due_date, project_id, assigned_to }) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, description, status: status || 'todo', priority: priority || 'medium', due_date, project_id, assigned_to }])
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
    const currentTask = get().tasks.find((task) => task.id === id)

    if (currentTask && !canMoveToStatus(currentTask.status, newStatus)) {
      const error = { message: 'Tasks can only move to the next column.' }
      set({ error: error.message })
      return { error }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
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
}))
