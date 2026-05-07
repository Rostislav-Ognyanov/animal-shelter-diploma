export const ROLE_VALUES = ['guest', 'client', 'employee', 'admin'];
export const MANAGED_USER_ROLE_VALUES = ['client', 'employee', 'admin'];

export const ROLE_LABELS = {
  guest: 'Гост',
  client: 'Клиент',
  employee: 'Служител',
  admin: 'Администратор',
};

export const ADOPTION_REQUEST_STATUS_VALUES = [
  'pending',
  'under-review',
  'approved',
  'rejected',
  'cancelled',
  'completed',
];

export const ROLE_RULES = {
  guest: {
    description: 'Нелогнат потребител с публичен достъп до платформата.',
    permissions: {
      home: ['view', 'view-shelter-info'],
      animals: ['list', 'detail', 'filter-search'],
      volunteers: ['apply'],
      donations: ['create'],
      rescueReports: ['create'],
      auth: ['login', 'register'],
    },
  },
  client: {
    description: 'Регистриран публичен потребител с личен профил и достъп до осиновяване.',
    permissions: {
      home: ['view', 'view-shelter-info'],
      animals: ['list', 'detail', 'filter-search'],
      volunteers: ['apply'],
      donations: ['create'],
      rescueReports: ['create'],
      profile: ['view-own', 'edit-own', 'change-own-password'],
      favorites: ['list-own', 'create-own', 'remove-own'],
      adoptions: [
        'create-own-request',
        'list-own',
        'detail-own',
        'track-own-status',
        'cancel-own-pending',
      ],
      activity: ['view-own-history'],
      auth: ['logout'],
    },
  },
  employee: {
    description: 'Служител, създаден от администратор, с оперативни права върху животни и заявки.',
    permissions: {
      home: ['view', 'view-shelter-info'],
      animals: ['list', 'detail', 'filter-search', 'create', 'edit', 'change-status', 'view-all'],
      volunteers: ['apply', 'view-all', 'detail', 'update-status', 'add-notes'],
      donations: ['create', 'view-all', 'detail'],
      rescueReports: ['create', 'view-all', 'detail', 'update-status', 'add-notes'],
      profile: ['view-own', 'edit-own', 'change-own-password'],
      staff: ['access-service-area'],
      adoptions: [
        'view-all',
        'filter-by-status',
        'update-status',
        'process',
        'add-internal-note',
      ],
      activity: ['view-own-history'],
      reports: ['view-operational', 'animals-by-status', 'requests-by-status'],
      auth: ['logout'],
    },
  },
  admin: {
    description: 'Администратор с пълен контрол върху системата и потребителите.',
    permissions: {
      home: ['view', 'view-shelter-info'],
      animals: [
        'list',
        'detail',
        'filter-search',
        'create',
        'edit',
        'change-status',
        'view-all',
        'deactivate',
        'archive',
        'full-access',
      ],
      volunteers: ['apply', 'view-all', 'detail', 'update-status', 'add-notes', 'full-access'],
      donations: ['create', 'view-all', 'detail', 'full-access'],
      rescueReports: ['create', 'view-all', 'detail', 'update-status', 'add-notes', 'full-access'],
      profile: ['view-own', 'edit-own', 'change-own-password'],
      staff: ['access-service-area'],
      adoptions: [
        'view-all',
        'filter-by-status',
        'update-status',
        'process',
        'add-internal-note',
        'view-statistics',
        'full-review',
      ],
      activity: ['view-own-history'],
      users: [
        'list',
        'filter-by-role',
        'filter-by-status',
        'detail',
        'create-employee',
        'edit-employee',
        'deactivate-employee',
        'promote-to-admin',
        'create-admin',
        'manage-roles',
        'activate',
        'deactivate',
        'manage-sensitive-access',
      ],
      reports: [
        'view-operational',
        'animals-by-status',
        'requests-by-status',
        'animals-by-species',
        'adoptions-overview',
        'requests-by-period',
        'users-by-role',
        'active-inactive-users',
        'full-access',
      ],
      admin: ['access-dashboard', 'view-internal-sections', 'system-administration'],
      auth: ['logout'],
    },
  },
};

export const ANIMAL_ACTIONS_BY_ROLE = {
  guest: ['list', 'detail', 'filter-search'],
  client: ['list', 'detail', 'filter-search'],
  employee: ['list', 'detail', 'filter-search', 'create', 'edit', 'change-status', 'view-all'],
  admin: [
    'list',
    'detail',
    'filter-search',
    'create',
    'edit',
    'change-status',
    'view-all',
    'deactivate',
    'archive',
    'full-access',
  ],
};

export const ADOPTION_REQUEST_ACTIONS_BY_ROLE = {
  guest: [],
  client: [
    'create-own-request',
    'list-own',
    'detail-own',
    'track-own-status',
    'cancel-own-pending',
  ],
  employee: ['view-all', 'filter-by-status', 'detail-any', 'update-status', 'add-internal-note'],
  admin: [
    'view-all',
    'filter-by-status',
    'detail-any',
    'update-status',
    'add-internal-note',
    'view-statistics',
    'full-review',
  ],
};

export const VOLUNTEER_APPLICATION_ACTIONS_BY_ROLE = {
  guest: ['apply'],
  client: ['apply'],
  employee: ['apply', 'view-all', 'detail', 'update-status', 'add-notes'],
  admin: ['apply', 'view-all', 'detail', 'update-status', 'add-notes', 'full-access'],
};

export const FAVORITE_ACTIONS_BY_ROLE = {
  guest: [],
  client: ['list-own', 'create-own', 'remove-own'],
  employee: [],
  admin: [],
};

export const DONATION_ACTIONS_BY_ROLE = {
  guest: ['create'],
  client: ['create'],
  employee: ['create', 'view-all', 'detail'],
  admin: ['create', 'view-all', 'detail', 'full-access'],
};

export const RESCUE_REPORT_ACTIONS_BY_ROLE = {
  guest: ['create'],
  client: ['create'],
  employee: ['create', 'view-all', 'detail', 'update-status', 'add-notes'],
  admin: ['create', 'view-all', 'detail', 'update-status', 'add-notes', 'full-access'],
};

export function normalizeRole(roleCandidate) {
  const normalizedRole = String(roleCandidate ?? 'guest').trim().toLowerCase();
  return ROLE_VALUES.includes(normalizedRole) ? normalizedRole : 'guest';
}

export function getRoleDefinition(roleCandidate) {
  const role = normalizeRole(roleCandidate);

  return {
    role,
    roleLabel: ROLE_LABELS[role],
    ...ROLE_RULES[role],
  };
}

export function getPermissionsByRole(roleCandidate) {
  return getRoleDefinition(roleCandidate).permissions;
}

export function hasPermission(roleCandidate, resource, action) {
  const permissions = getPermissionsByRole(roleCandidate);
  const allowedActions = permissions[resource] ?? [];
  return allowedActions.includes(action);
}

export function getAllowedAnimalActions(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  return ANIMAL_ACTIONS_BY_ROLE[role];
}

export function getAllowedAdoptionRequestActions(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  return ADOPTION_REQUEST_ACTIONS_BY_ROLE[role];
}

export function getAllowedVolunteerApplicationActions(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  return VOLUNTEER_APPLICATION_ACTIONS_BY_ROLE[role];
}

export function getAllowedFavoriteActions(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  return FAVORITE_ACTIONS_BY_ROLE[role];
}

export function getAllowedDonationActions(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  return DONATION_ACTIONS_BY_ROLE[role];
}

export function getAllowedRescueReportActions(roleCandidate) {
  const role = normalizeRole(roleCandidate);
  return RESCUE_REPORT_ACTIONS_BY_ROLE[role];
}




