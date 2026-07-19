import { create } from 'zustand'
import { authService } from '../lib/services/authService'
import { projectService } from '../lib/services/projectService'
import { sprintService } from '../lib/services/sprintService'
import { analyticsService } from '../lib/services/analyticsService'

export const useProjectStore = create((set, get) => ({
  projects: [],
  members: [],
  invites: [],
  sprints: [],
  activeProject: null,
  loading: false,
  error: null,

  reset: () => set({
    projects: [],
    members: [],
    invites: [],
    sprints: [],
    activeProject: null,
    loading: false,
    error: null,
  }),

  fetchProjects: async (workspaceId) => {
    if (!workspaceId) {
      set({ projects: [], activeProject: null, loading: false })
      return { data: [] }
    }
    set({ loading: true, error: null })
    const { data, error } = await projectService.fetchProjects(workspaceId)

    if (error) {
      set({ projects: [], activeProject: null, error: error.message, loading: false })
      return { error }
    }

    const activeProjectId = get().activeProject?.id

    set({
      projects: data,
      activeProject: data.find((project) => project.id === activeProjectId) ?? null,
      error: null,
      loading: false,
    })

    return { data }
  },

  setActiveProject: (project) => set({ activeProject: project }),

  createProject: async ({ name, description, workspaceId }) => {
    const { data: { user } } = await authService.getUser()
    if (!user) return { error: { message: 'Not authenticated' } }

    const { data, error } = await projectService.createProject({ name, description, owner_id: user.id, workspace_id: workspaceId })

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      projects: [data, ...state.projects],
      activeProject: data,
      error: null,
    }))

    analyticsService.track('Project Created', {
      projectId: data.id,
      name: data.name,
      workspaceId,
    })

    return { data }
  },

  updateProject: async (id, updates) => {
    const { data, error } = await projectService.updateProject(id, updates)

    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? data : p)),
      activeProject: state.activeProject?.id === id ? data : state.activeProject,
      error: null,
    }))
    return { data }
  },

  deleteProject: async (id) => {
    const { error } = await projectService.deleteProject(id)
    if (error) {
      set({ error: error.message })
      return { error }
    }

    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
      error: null,
    }))
    return {}
  },

  fetchMembers: async (projectId) => {
    const { data, error } = await projectService.fetchMembers(projectId)

    if (error) return { error }
    set({ members: data })
    return { data }
  },

  fetchInvites: async (projectId) => {
    const { data, error } = await projectService.fetchInvites(projectId)

    if (error) return { error }
    set({ invites: data })
    return { data }
  },

  fetchSprints: async (projectId) => {
    const { data, error } = await sprintService.fetchSprints(projectId)

    if (error) return { error }
    set({ sprints: data })
    return { data }
  },

  createInvite: async (projectId, email, role = 'member') => {
    const { data: { user } } = await authService.getUser()
    if (user?.email === email) {
      return { error: { message: 'You cannot invite yourself.' } }
    }

    const { data, error } = await projectService.createInvite(projectId, email, role)

    if (error) return { error }
    set((state) => ({ invites: [data, ...state.invites] }))

    analyticsService.track('Invite Sent', {
      type: 'project',
      projectId,
      email,
      role,
      inviteId: data.id,
    })

    return { data }
  },

  deleteInvite: async (id) => {
    const { error } = await projectService.deleteInvite(id)
    if (error) return { error }
    set((state) => ({ invites: state.invites.filter((i) => i.id !== id) }))
    return {}
  },

  acceptInvite: async (inviteId) => {
    const { data: { user } } = await authService.getUser()
    if (!user) return { error: { message: 'Session expired. Please log in again.' } }
    const result = await projectService.acceptInvite(inviteId, user.id)
    
    if (result && !result.error) {
      analyticsService.track('Invite Accepted', {
        type: 'project',
        inviteId,
        projectId: result.projectId,
        userId: user.id,
      })
    }

    return result
  },
}))
