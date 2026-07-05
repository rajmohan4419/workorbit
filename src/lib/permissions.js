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

export function isWorkspaceOwner(role) {
  return role === 'owner'
}

export function isOwner(userId, ownerId) {
  return userId && ownerId && userId === ownerId
}

// Workspace Permissions
export function canCreateProject(wsRole) {
  return wsRole === 'owner' || wsRole === 'admin'
}

export function canManageWorkspace(wsRole) {
  return wsRole === 'owner' || wsRole === 'admin'
}

export function canDeleteWorkspace(wsRole) {
  return wsRole === 'owner'
}

export function canInviteMembers(wsRole) {
  return wsRole === 'owner' || wsRole === 'admin'
}

// Project Permissions (Inherited from Workspace Role)
export function canEditProject(wsRole) {
  return wsRole === 'owner' || wsRole === 'admin'
}

export function canDeleteProject(wsRole) {
  return wsRole === 'owner' || wsRole === 'admin'
}

// Task Permissions
export function canCreateTask(wsRole) {
  return wsRole !== 'viewer'
}

export function canEditTaskMetadata(wsRole, userId, taskCreatorId, taskAssigneeId) {
  if (wsRole === 'owner' || wsRole === 'admin') return true
  if (wsRole === 'member' && (userId === taskCreatorId || userId === taskAssigneeId)) return true
  return false
}

export function canDeleteTask(wsRole, userId, taskCreatorId) {
  if (wsRole === 'owner' || wsRole === 'admin') return true
  if (wsRole === 'member' && userId === taskCreatorId) return true
  return false
}

export function canComment(wsRole) {
  return wsRole !== 'viewer'
}

export function canManageSprints(wsRole) {
  return wsRole === 'owner' || wsRole === 'admin'
}
