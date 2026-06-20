export const ROLE_LABELS = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTIONS = {
  admin: 'Trusted team lead. Can manage projects, tasks, and invite members.',
  member: 'Contributor. Can create tasks and edit assigned tasks.',
  viewer: 'Stakeholder. Can view board and comment.',
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? 'Member'
}

export function getRoleDescription(role) {
  return ROLE_DESCRIPTIONS[role] ?? ROLE_DESCRIPTIONS.member
}

export function isOwner(userId, projectOwnerId) {
  return userId && projectOwnerId && userId === projectOwnerId
}

export function canCreateProject(role) {
  return role === 'admin'
}

export function canEditProject(role, userId, projectOwnerId) {
  return role === 'admin' || isOwner(userId, projectOwnerId)
}

export function canDeleteProject(userId, projectOwnerId) {
  return isOwner(userId, projectOwnerId)
}

export function canInviteMembers(role, userId, projectOwnerId) {
  return role === 'admin' || isOwner(userId, projectOwnerId)
}

export function canManageRoles(userId, projectOwnerId) {
  return isOwner(userId, projectOwnerId)
}

export function canCreateTask(role, userId, projectOwnerId) {
  return role === 'admin' || role === 'member' || isOwner(userId, projectOwnerId)
}

export function canDeleteTask(role, userId, projectOwnerId) {
  return role === 'admin' || isOwner(userId, projectOwnerId)
}

export function canEditTaskMetadata(role, userId, taskCreatorId, taskAssigneeId, projectOwnerId) {
  if (role === 'admin' || isOwner(userId, projectOwnerId)) return true
  if (role === 'member' && (userId === taskCreatorId || userId === taskAssigneeId)) return true
  return false
}

export function canEditTaskStatus(role, userId, taskCreatorId, taskAssigneeId, projectOwnerId) {
  return canEditTaskMetadata(role, userId, taskCreatorId, taskAssigneeId, projectOwnerId)
}

export function canComment(role) {
  return role === 'admin' || role === 'member' || role === 'viewer'
}
