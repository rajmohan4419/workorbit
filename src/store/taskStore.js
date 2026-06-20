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

export const useTaskStore = create((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (projectId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) set({ error: error.message, loading: false })
    else set({ tasks: data, loading: false })
  },

  createTask: async ({ title, description, status, priority, due_date, project_id, assigned_to }) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, description, status: status || 'todo', priority: priority || 'medium', due_date, project_id, assigned_to }])
      .select()
      .single()

    if (error) return { error }
    set((state) => ({ tasks: [...state.tasks, data] }))
    return { data }
  },

  updateTask: async (id, updates) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return { error }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? data : t)),
    }))
    return { data }
  },

  moveTask: async (id, newStatus) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single()

    if (error) return { error }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? data : t)),
    }))
    return { data }
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) return { error }
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
    return {}
  },
}))
