export const ROLE_LABELS = {
  owner: 'Workspace Owner',
  admin: 'Workspace Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTIONS = {
  owner: 'Full control over the workspace and all projects.',
  admin: 'Workspace administrator. Can manage projects, members, and settings.',
  member: 'Contributor. Can create tasks and projects.',
  viewer: 'Read-only access. Can view board and comment.',
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
  return role === 'owner' || role === 'admin' || role === 'member'
}

export function canEditProject(role, userId, projectOwnerId) {
  return role === 'owner' || role === 'admin' || isOwner(userId, projectOwnerId)
}

export function canDeleteProject(role, userId, projectOwnerId) {
  return role === 'owner' || isOwner(userId, projectOwnerId)
}

export function canInviteMembers(role, userId, projectOwnerId) {
  return role === 'owner' || role === 'admin' || isOwner(userId, projectOwnerId)
}

export function canManageRoles(role, userId, projectOwnerId) {
  return role === 'owner' || isOwner(userId, projectOwnerId)
}

export function canCreateTask(role, userId, projectOwnerId) {
  return role === 'owner' || role === 'admin' || role === 'member' || isOwner(userId, projectOwnerId)
}

export function canDeleteTask(role, userId, projectOwnerId) {
  return role === 'owner' || role === 'admin' || isOwner(userId, projectOwnerId)
}

export function canEditTaskMetadata(role, userId, taskCreatorId, taskAssigneeId, projectOwnerId) {
  if (role === 'owner' || role === 'admin' || isOwner(userId, projectOwnerId)) return true
  if (role === 'member' && (userId === taskCreatorId || userId === taskAssigneeId)) return true
  return false
}

export function canEditTaskStatus(role, userId, taskCreatorId, taskAssigneeId, projectOwnerId) {
  return canEditTaskMetadata(role, userId, taskCreatorId, taskAssigneeId, projectOwnerId)
}

export function canComment(role) {
  return role === 'admin' || role === 'member' || role === 'viewer'
}
