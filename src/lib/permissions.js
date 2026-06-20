export const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  team_member: 'Team Member',
}

export const ROLE_DESCRIPTIONS = {
  admin: 'All access across projects, tasks, members, and profile administration.',
  manager: 'Can manage projects they are assigned to and fully manage tasks in those projects.',
  team_member: 'Can create tasks and move task status, but cannot delete tasks or change due dates and priority.',
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? 'Team Member'
}

export function getRoleDescription(role) {
  return ROLE_DESCRIPTIONS[role] ?? ROLE_DESCRIPTIONS.team_member
}

export function canCreateProject(role) {
  return role === 'admin'
}

export function canManageAssignedProjects(role) {
  return role === 'admin' || role === 'manager'
}

export function canCreateTask(role) {
  return role === 'admin' || role === 'manager' || role === 'team_member'
}

export function canDeleteTask(role) {
  return role === 'admin' || role === 'manager'
}

export function canEditTaskMetadata(role, userId, taskCreatorId) {
  return role === 'admin' || role === 'manager' || (userId && userId === taskCreatorId)
}

export function canEditTaskStatus(role) {
  return role === 'admin' || role === 'manager' || role === 'team_member'
}
