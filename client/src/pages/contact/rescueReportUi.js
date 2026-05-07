export const RESCUE_REPORT_STATUS_LABELS = {
  pending: 'В очакване',
  'under-review': 'В преглед',
  accepted: 'Приет',
  resolved: 'Решен',
  rejected: 'Отхвърлен',
};

export const RESCUE_REPORT_STATUS_OPTIONS = Object.entries(RESCUE_REPORT_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const RESCUE_REPORT_URGENCY_LABELS = {
  low: 'Ниска',
  medium: 'Средна',
  high: 'Висока',
  critical: 'Критична',
};

export const RESCUE_REPORT_URGENCY_OPTIONS = Object.entries(RESCUE_REPORT_URGENCY_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const RESCUE_REPORT_SPECIES_LABELS = {
  dog: 'Куче',
  cat: 'Котка',
  rabbit: 'Зайче',
  fox: 'Лисица',
  bird: 'Птица',
  other: 'Друго',
};

export const RESCUE_REPORT_SPECIES_OPTIONS = Object.entries(RESCUE_REPORT_SPECIES_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function getRescueReportStatusLabel(status) {
  return RESCUE_REPORT_STATUS_LABELS[status] ?? 'В очакване';
}

export function getRescueReportUrgencyLabel(urgency) {
  return RESCUE_REPORT_URGENCY_LABELS[urgency] ?? 'Средна';
}

export function getRescueReportSpeciesLabel(species) {
  return RESCUE_REPORT_SPECIES_LABELS[species] ?? 'Друго';
}

export function getRescueReportDisplayName(report) {
  return String(report?.name ?? '').trim() || 'Подател';
}

export function formatRescueReportDate(dateValue) {
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

export function getRescueReportStatusGuidance(status) {
  switch (status) {
    case 'pending':
      return 'Сигналът очаква първоначален преглед от екипа.';
    case 'under-review':
      return 'Екипът преглежда подадената информация.';
    case 'accepted':
      return 'Сигналът е приет за действие от приюта.';
    case 'resolved':
      return 'Случаят е обработен и отбелязан като решен.';
    case 'rejected':
      return 'Сигналът е приключен без последващо действие.';
    default:
      return 'Няма допълнителни указания.';
  }
}

export function buildRescueReportListQuery(status, search) {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getRescueReportManagementPath(role) {
  return role === 'admin' ? '/admin/signals' : '/staff/signals';
}
