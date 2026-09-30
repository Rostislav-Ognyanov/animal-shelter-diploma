import { ROLE_LABELS } from '../../auth/roleUi.js';

export const USER_ROLE_LABELS = {
  client: ROLE_LABELS.client,
  employee: ROLE_LABELS.employee,
  admin: ROLE_LABELS.admin,
};

export const USER_STATUS_LABELS = {
  active: 'Активен',
  inactive: 'Неактивен',
};

export const USER_ROLE_OPTIONS = [
  { value: '', label: 'Всички роли' },
  { value: 'client', label: USER_ROLE_LABELS.client },
  { value: 'employee', label: USER_ROLE_LABELS.employee },
  { value: 'admin', label: USER_ROLE_LABELS.admin },
];

export const USER_STATUS_OPTIONS = [
  { value: '', label: 'Всички статуси' },
  { value: 'active', label: USER_STATUS_LABELS.active },
  { value: 'inactive', label: USER_STATUS_LABELS.inactive },
];

export const USER_PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export const EMPTY_USER_SUMMARY = {
  total: 0,
  active: 0,
  inactive: 0,
  clients: 0,
  employees: 0,
  admins: 0,
};

export const EMPTY_USER_EDIT_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'client',
};

export function buildUserEditForm(user) {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'client',
  };
}

export function getUserRoleLabel(role) {
  return USER_ROLE_LABELS[role] ?? 'Потребител';
}

export function getUserStatusLabel(isActive) {
  return isActive ? USER_STATUS_LABELS.active : USER_STATUS_LABELS.inactive;
}

export function getUserStatusTone(isActive) {
  return isActive ? 'is-active' : 'is-inactive';
}

export function getUserDisplayName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

  if (fullName) {
    return fullName;
  }

  return user?.username || 'Потребител';
}


export function formatUserDate(value) {
  if (!value) {
    return 'Няма данни';
  }

  try {
    return new Intl.DateTimeFormat('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
