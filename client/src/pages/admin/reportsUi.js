import { getUserRoleLabel } from '../users/usersUi.js';

export const REPORT_PERIOD_OPTIONS = [
  { value: 'all', label: 'Всички данни' },
  { value: '7d', label: 'Последни 7 дни' },
  { value: '30d', label: 'Последни 30 дни' },
  { value: '90d', label: 'Последни 90 дни' },
  { value: 'this-month', label: 'Текущ месец' },
  { value: 'this-year', label: 'Текуща година' },
  { value: 'custom', label: 'Персонализиран диапазон' },
];

const ALLOWED_PERIODS = new Set(REPORT_PERIOD_OPTIONS.map((option) => option.value));

const ANIMAL_STATUS_LABELS = {
  available: 'Готови за осиновяване',
  reserved: 'Резервирани',
  adopted: 'Осиновени',
  'medical-care': 'Медицинска грижа',
  inactive: 'Неактивни',
  archived: 'Архивирани',
};

const ANIMAL_SPECIES_LABELS = {
  dog: 'Кучета',
  cat: 'Котки',
  rabbit: 'Зайци',
  fox: 'Лисици',
};

const ANIMAL_SIZE_LABELS = {
  small: 'Малък размер',
  medium: 'Среден размер',
  large: 'Голям размер',
  'extra-large': 'Много голям размер',
};

const ANIMAL_GENDER_LABELS = {
  male: 'Мъжки',
  female: 'Женски',
  unknown: 'Неуточнен',
};

const ANIMAL_CARE_LABELS = {
  vaccinated: 'Ваксинирани',
  'not-vaccinated': 'Неваксинирани',
  neutered: 'Кастрирани',
  'not-neutered': 'Некастрирани',
};

const ADOPTION_STATUS_LABELS = {
  pending: 'В очакване',
  'under-review': 'В преглед',
  approved: 'Одобрени',
  rejected: 'Отхвърлени',
  cancelled: 'Отменени',
  completed: 'Завършени',
};

const USER_ACTIVITY_LABELS = {
  active: 'Активни профили',
  inactive: 'Неактивни профили',
};

const INTAKE_PERIOD_LABELS = {
  '7d': 'Последни 7 дни',
  '30d': 'Последни 30 дни',
  '90d': 'Последни 90 дни',
};

function getBreakdownLabel(kind, key) {
  switch (kind) {
    case 'animal-status':
      return ANIMAL_STATUS_LABELS[key] ?? key;
    case 'animal-species':
      return ANIMAL_SPECIES_LABELS[key] ?? key;
    case 'animal-size':
      return ANIMAL_SIZE_LABELS[key] ?? key;
    case 'animal-gender':
      return ANIMAL_GENDER_LABELS[key] ?? key;
    case 'animal-care':
      return ANIMAL_CARE_LABELS[key] ?? key;
    case 'request-status':
      return ADOPTION_STATUS_LABELS[key] ?? key;
    case 'user-role':
      return getUserRoleLabel(key);
    case 'user-activity':
      return USER_ACTIVITY_LABELS[key] ?? key;
    default:
      return key;
  }
}

function formatDateShort(value) {
  if (!value) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function parseReportsFilters(searchParams) {
  const periodCandidate = String(searchParams.get('period') ?? 'all').trim().toLowerCase();
  const period = ALLOWED_PERIODS.has(periodCandidate) ? periodCandidate : 'all';

  return {
    period,
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  };
}

export function buildReportsQueryString(filters = {}) {
  const params = new URLSearchParams();
  const period = filters.period && ALLOWED_PERIODS.has(filters.period) ? filters.period : 'all';

  if (period !== 'all') {
    params.set('period', period);
  }

  if (period === 'custom') {
    if (filters.dateFrom) {
      params.set('dateFrom', filters.dateFrom);
    }

    if (filters.dateTo) {
      params.set('dateTo', filters.dateTo);
    }
  }

  return params.toString();
}

export function buildReportsSearchParams(filters = {}) {
  const queryString = buildReportsQueryString(filters);
  return queryString ? new URLSearchParams(queryString) : new URLSearchParams();
}

export function formatReportsDate(value) {
  if (!value) {
    return 'Няма данни';
  }

  try {
    return new Intl.DateTimeFormat('bg-BG', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getReportsSourceLabel(source) {
  switch (source?.mode) {
    case 'mongodb':
      return 'MongoDB е активният източник на данни.';
    case 'mock-fallback':
      return 'Работи се в mock fallback режим за разработка.';
    default:
      return source?.label || 'Няма данни за източника.';
  }
}

export function buildReportsFilterSummary(filters, serverFilters = null) {
  const effectiveFilters = serverFilters ?? filters;

  if (!effectiveFilters?.isFiltered) {
    return 'Показани са всички налични отчетни данни в системата.';
  }

  if (effectiveFilters?.label) {
    return `Активен период: ${effectiveFilters.label}.`;
  }

  if (effectiveFilters.period === 'custom') {
    return `Активен персонализиран диапазон: ${formatDateShort(effectiveFilters.dateFrom)} - ${formatDateShort(effectiveFilters.dateTo)}.`;
  }

  const option = REPORT_PERIOD_OPTIONS.find((entry) => entry.value === effectiveFilters.period);
  return `Активен период: ${option?.label ?? 'Филтрирани данни'}.`;
}

export function buildDashboardCards(dashboard = {}) {
  return [
    {
      key: 'totalAnimals',
      label: 'Общо животни',
      value: dashboard.totalAnimals ?? 0,
      note: 'Всички записи за животни',
    },
    {
      key: 'availableAnimals',
      label: 'Налични за осиновяване',
      value: dashboard.availableAnimals ?? 0,
      note: 'Животни със статус available',
    },
    {
      key: 'reservedAnimals',
      label: 'Резервирани',
      value: dashboard.reservedAnimals ?? 0,
      note: 'Животни в активен процес по заявка',
    },
    {
      key: 'adoptedAnimals',
      label: 'Осиновени',
      value: dashboard.adoptedAnimals ?? 0,
      note: 'Завършени осиновявания',
    },
    {
      key: 'pendingRequests',
      label: 'Чакащи заявки',
      value: dashboard.pendingRequests ?? 0,
      note: 'Заявки, които очакват преглед',
    },
    {
      key: 'totalUsers',
      label: 'Общо потребители',
      value: dashboard.totalUsers ?? 0,
      note: 'Всички профили в системата',
    },
    {
      key: 'employeeUsers',
      label: 'Служители',
      value: dashboard.employeeUsers ?? 0,
      note: 'Оперативни профили',
    },
    {
      key: 'adminUsers',
      label: 'Администратори',
      value: dashboard.adminUsers ?? 0,
      note: 'Профили с пълен достъп',
    },
  ];
}

export function buildActivityCards(activity = {}, filters = null) {
  const periodLabel = filters?.isFiltered ? filters.label : 'Всички данни';

  return [
    {
      key: 'newAnimals',
      label: 'Новопостъпили животни',
      value: activity.newAnimals ?? 0,
      note: periodLabel,
    },
    {
      key: 'newRequests',
      label: 'Нови заявки',
      value: activity.newRequests ?? 0,
      note: periodLabel,
    },
    {
      key: 'completedAdoptions',
      label: 'Завършени осиновявания',
      value: activity.completedAdoptions ?? 0,
      note: periodLabel,
    },
    {
      key: 'newUsers',
      label: 'Нови профили',
      value: activity.newUsers ?? 0,
      note: periodLabel,
    },
  ];
}

export function enrichBreakdown(items = [], kind) {
  const total = items.reduce((sum, item) => sum + (item?.count ?? 0), 0);
  const max = items.reduce((largest, item) => Math.max(largest, item?.count ?? 0), 0);

  return items.map((item) => ({
    ...item,
    label: getBreakdownLabel(kind, item.key),
    shareOfTotal: total > 0 ? Math.round(((item.count ?? 0) / total) * 100) : 0,
    widthPercent: max > 0 ? Math.max(8, Math.round(((item.count ?? 0) / max) * 100)) : 0,
  }));
}

export function enrichIntakeByPeriod(items = []) {
  const max = items.reduce((largest, item) => Math.max(largest, item?.count ?? 0), 0);

  return items.map((item) => ({
    ...item,
    label: INTAKE_PERIOD_LABELS[item.key] ?? item.key,
    widthPercent: max > 0 ? Math.max(10, Math.round(((item.count ?? 0) / max) * 100)) : 0,
  }));
}

export function buildReportsHighlights(overview = {}, animalMasterData = {}) {
  const totalAnimals = overview.dashboard?.totalAnimals ?? 0;
  const availableAnimals = overview.dashboard?.availableAnimals ?? 0;
  const pendingRequests = overview.dashboard?.pendingRequests ?? 0;
  const completedAdoptions = overview.reports?.adoptions?.completedCount ?? 0;
  const filteredAnimals = animalMasterData.totals?.totalAnimals ?? 0;

  return [
    {
      key: 'adoption-pressure',
      title: 'Натоварване по осиновявания',
      text:
        pendingRequests > 0
          ? `${pendingRequests} заявки чакат действие от екипа.`
          : 'В момента няма чакащи заявки и потокът е спокоен.',
    },
    {
      key: 'availability',
      title: 'Наличност на животни',
      text:
        totalAnimals > 0
          ? `${availableAnimals} от ${totalAnimals} животни са готови за осиновяване.`
          : 'Все още няма въведени животни, от които да се изведе наличност.',
    },
    {
      key: 'filtered-animal-slice',
      title: 'Животни в избрания период',
      text:
        filteredAnimals > 0
          ? `${filteredAnimals} записа за животни попадат в текущия отчетен филтър.`
          : 'В избрания период няма записи за животни, които да попадат в отчетния обхват.',
    },
    {
      key: 'completed-adoptions',
      title: 'Завършени осиновявания',
      text:
        completedAdoptions > 0
          ? `${completedAdoptions} осиновявания са маркирани като завършени в текущия отчетен обхват.`
          : 'В текущия отчетен обхват няма завършени осиновявания.',
    },
  ];
}

export function downloadReportsExport(payload, filters) {
  if (typeof window === 'undefined') {
    return;
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    filters,
    ...payload,
  };

  const blob = new Blob([`${JSON.stringify(exportPayload, null, 2)}\n`], {
    type: 'application/json;charset=utf-8',
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const dateSuffix = new Date().toISOString().slice(0, 10);

  anchor.href = objectUrl;
  anchor.download = `reports-dashboard-${dateSuffix}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(objectUrl);
}


