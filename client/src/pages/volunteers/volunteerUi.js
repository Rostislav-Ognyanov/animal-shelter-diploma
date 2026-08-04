export const VOLUNTEER_STATUS_LABELS = {
  pending: 'В очакване',
  'under-review': 'В преглед',
  approved: 'Одобрена',
  rejected: 'Отхвърлена',
};

export const VOLUNTEER_STATUS_OPTIONS = Object.entries(VOLUNTEER_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const VOLUNTEER_STATUS_TRANSITIONS = {
  pending: ['under-review'],
  'under-review': ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

export const VOLUNTEER_POSITION_LABELS = {
  'animal-care': 'Грижа за животни',
  cleaning: 'Почистване',
  walking: 'Разходка',
  transport: 'Транспорт',
  'admin-support': 'Административна помощ',
  'events-campaigns': 'Събития и кампании',
  other: 'Друго',
};

export const VOLUNTEER_POSITION_OPTIONS = Object.entries(VOLUNTEER_POSITION_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function getVolunteerStatusLabel(status) {
  return VOLUNTEER_STATUS_LABELS[status] ?? 'В очакване';
}

export function getVolunteerStatusTransitions(status, allowedTransitions) {
  if (Array.isArray(allowedTransitions)) {
    return allowedTransitions;
  }

  return VOLUNTEER_STATUS_TRANSITIONS[status] ?? [];
}

export function getVolunteerStatusTransitionOptions(
  status,
  allowedTransitions,
  { includeCurrent = false } = {}
) {
  const transitionValues = getVolunteerStatusTransitions(status, allowedTransitions);
  const values = includeCurrent ? [status, ...transitionValues] : transitionValues;

  return [...new Set(values.filter(Boolean))].map((value) => ({
    value,
    label: getVolunteerStatusLabel(value),
  }));
}

export function getVolunteerPositionLabel(position) {
  return VOLUNTEER_POSITION_LABELS[position] ?? 'Друго';
}

export function getVolunteerPositionSummary(application) {
  const preferredPositions = Array.isArray(application?.preferredPositions)
    ? application.preferredPositions
    : [];

  if (preferredPositions.length === 0) {
    return 'Няма избрани дейности';
  }

  return preferredPositions
    .map((position) => {
      if (position === 'other') {
        const otherPosition = String(application?.otherPosition ?? '').trim();
        return otherPosition ? `Друго: ${otherPosition}` : getVolunteerPositionLabel(position);
      }

      return getVolunteerPositionLabel(position);
    })
    .join(', ');
}

export function getVolunteerDisplayName(application) {
  return [application?.firstName, application?.lastName].filter(Boolean).join(' ').trim() || 'Кандидат';
}

export function formatVolunteerDate(dateValue) {
  if (!dateValue) {
    return 'Няма дата';
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Невалидна дата';
  }

  return new Intl.DateTimeFormat('bg-BG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
}

export function getVolunteerStatusGuidance(status) {
  switch (status) {
    case 'pending':
      return 'Очаква първоначален преглед от екипа.';
    case 'under-review':
      return 'Кандидатурата е в активен преглед.';
    case 'approved':
      return 'Може да се премине към следващ контакт с кандидата.';
    case 'rejected':
      return 'Кандидатурата е приключена без одобрение.';
    default:
      return 'Няма допълнителни указания.';
  }
}

export function buildVolunteerListQuery(status, search, page, limit) {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  if (page) {
    params.set('page', String(page));
  }

  if (limit) {
    params.set('limit', String(limit));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getVolunteerManagementPath(role) {
  return role === 'admin' ? '/admin/volunteers' : '/staff/volunteers';
}
