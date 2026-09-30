import {
  MANAGED_USER_ROLE_VALUES,
  ROLE_LABELS,
  ROLE_VALUES,
} from '../../../shared/domain/roleConstants.js';

export { MANAGED_USER_ROLE_VALUES, ROLE_LABELS, ROLE_VALUES };

const ROLE_RULES = {
  guest: {
    description: 'Нелогнат потребител с публичен достъп до платформата.',
    permissions: {},
  },
  client: {
    description: 'Регистриран публичен потребител с личен профил и достъп до осиновяване.',
    permissions: {
      profile: ['view-own', 'edit-own', 'change-own-password'],
      notifications: ['list-own', 'mark-own-read'],
      favorites: ['list-own', 'create-own', 'remove-own'],
      adoptions: [
        'create-own-request',
        'list-own',
        'detail-own',
        'cancel-own-pending',
      ],
    },
  },
  employee: {
    description:
      'Служител, създаден от администратор, с оперативни права върху животни, заявки, запитвания и публично съдържание.',
    permissions: {
      animals: ['view-all', 'create', 'edit', 'change-status'],
      volunteers: ['view-all', 'detail', 'review'],
      donations: ['view-all', 'detail'],
      rescueReports: ['view-all', 'detail', 'review'],
      contactInquiries: ['view-all', 'detail', 'update-status'],
      profile: ['view-own', 'edit-own', 'change-own-password'],
      notifications: ['list-own', 'mark-own-read'],
      content: ['update'],
      speciesContent: ['view-draft', 'update'],
      rescueStories: ['view-all', 'create', 'update', 'archive'],
      adoptions: ['view-all', 'update-status'],
    },
  },
  admin: {
    description:
      'Администратор с пълен контрол върху системата, потребителите, отчетите, настройките и съдържанието.',
    permissions: {
      animals: ['view-all', 'create', 'edit', 'change-status', 'deactivate'],
      volunteers: ['view-all', 'detail', 'review'],
      donations: ['view-all', 'detail', 'update-status'],
      rescueReports: ['view-all', 'detail', 'review'],
      contactInquiries: ['view-all', 'detail', 'update-status'],
      profile: ['view-own', 'edit-own', 'change-own-password'],
      notifications: ['list-own', 'mark-own-read'],
      content: ['update', 'manage-settings', 'manage-legal'],
      speciesContent: ['view-draft', 'update', 'publish', 'archive'],
      rescueStories: [
        'view-all',
        'create',
        'update',
        'publish',
        'unpublish',
        'archive',
      ],
      adoptions: ['view-all', 'update-status'],
      users: [
        'list',
        'detail',
        'create-employee',
        'manage-users',
        'manage-sensitive-access',
      ],
      reports: ['view-operational'],
    },
  },
};

Object.values(ROLE_RULES).forEach((roleRules) => {
  Object.values(roleRules.permissions).forEach(Object.freeze);
  Object.freeze(roleRules.permissions);
  Object.freeze(roleRules);
});
Object.freeze(ROLE_RULES);

function clonePermissions(permissions = {}) {
  return Object.fromEntries(
    Object.entries(permissions).map(([resource, actions]) => [
      resource,
      [...actions],
    ])
  );
}

export function normalizeRole(roleCandidate) {
  const normalizedRole = String(roleCandidate ?? 'guest').trim().toLowerCase();
  return ROLE_VALUES.includes(normalizedRole) ? normalizedRole : 'guest';
}

export function getRoleDefinition(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  const roleRules = ROLE_RULES[role];

  return {
    role,
    roleLabel: ROLE_LABELS[role],
    description: roleRules.description,
    permissions: clonePermissions(roleRules.permissions),
  };
}

export function getPermissionsByRole(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  return clonePermissions(ROLE_RULES[role].permissions);
}

export function getAllowedActions(roleCandidate, resource) {
  const role = normalizeRole(roleCandidate);
  return [...(ROLE_RULES[role].permissions?.[resource] ?? [])];
}

export function hasPermission(roleCandidate, resource, action) {
  // Access is deny-by-default: an action is allowed only when explicitly
  // granted to the current role.
  return getAllowedActions(roleCandidate, resource).includes(action);
}
