export const USER_ROLE_LABELS = {
  client: 'Клиент',
  employee: 'Служител',
  admin: 'Администратор',
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

export const USER_PAGE_SIZE_OPTIONS = [5, 10, 20];

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

export function buildUserCollectionMetrics(users = []) {
  return users.reduce(
    (summary, user) => {
      const nextSummary = {
        ...summary,
        total: summary.total + 1,
        active: summary.active + (user?.isActive ? 1 : 0),
        inactive: summary.inactive + (user?.isActive ? 0 : 1),
      };

      if (user?.role === 'client') {
        nextSummary.clients += 1;
      }

      if (user?.role === 'employee') {
        nextSummary.employees += 1;
      }

      if (user?.role === 'admin') {
        nextSummary.admins += 1;
      }

      return nextSummary;
    },
    {
      total: 0,
      active: 0,
      inactive: 0,
      clients: 0,
      employees: 0,
      admins: 0,
    }
  );
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
