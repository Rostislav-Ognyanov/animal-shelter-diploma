import { formatDonationAmount } from '../donations/donationUi.js';
import { ADOPTION_STATUS_LABELS } from '../../../../shared/domain/adoptionConstants.js';
import {
  ANIMAL_SPECIES_LABELS,
  ANIMAL_STATUS_LABELS,
} from '../../../../shared/domain/animalConstants.js';
import { CONTACT_INQUIRY_STATUS_LABELS } from '../../../../shared/domain/contactInquiryConstants.js';
import { DONATION_STATUS_LABELS } from '../../../../shared/domain/donationConstants.js';
import {
  REPORT_PERIOD_LABELS,
  REPORT_PERIOD_VALUES,
} from '../../../../shared/domain/reportConstants.js';
import {
  RESCUE_REPORT_STATUS_LABELS,
  RESCUE_REPORT_URGENCY_LABELS,
} from '../../../../shared/domain/rescueReportConstants.js';
import { VOLUNTEER_STATUS_LABELS } from '../../../../shared/domain/volunteerConstants.js';

export const REPORT_PERIOD_OPTIONS = Object.freeze(
  REPORT_PERIOD_VALUES
    .map((value) =>
      Object.freeze({
        value,
        label: REPORT_PERIOD_LABELS[value] ?? value,
      })
    )
);

const ALLOWED_PERIODS = new Set(REPORT_PERIOD_OPTIONS.map((option) => option.value));
const DEFAULT_REPORT_PERIOD = '30d';
const DEFAULT_REPORT_PERIOD_LABEL = REPORT_PERIOD_LABELS[DEFAULT_REPORT_PERIOD];

function getBreakdownLabel(kind, key) {
  switch (kind) {
    case 'animal-status':
      return ANIMAL_STATUS_LABELS[key] ?? key;
    case 'animal-species':
      return ANIMAL_SPECIES_LABELS[key] ?? key;
    case 'request-status':
      return ADOPTION_STATUS_LABELS[key] ?? key;
    case 'volunteer-status':
      return VOLUNTEER_STATUS_LABELS[key] ?? key;
    case 'rescue-report-status':
      return RESCUE_REPORT_STATUS_LABELS[key] ?? key;
    case 'rescue-report-urgency':
      return RESCUE_REPORT_URGENCY_LABELS[key] ?? key;
    case 'contact-inquiry-status':
      return CONTACT_INQUIRY_STATUS_LABELS[key] ?? key;
    case 'donation-status':
      return DONATION_STATUS_LABELS[key] ?? key;
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
  const periodCandidate = String(searchParams.get('period') ?? DEFAULT_REPORT_PERIOD)
    .trim()
    .toLowerCase();
  const period = ALLOWED_PERIODS.has(periodCandidate)
    ? periodCandidate
    : DEFAULT_REPORT_PERIOD;

  return {
    period,
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  };
}

export function buildReportsQueryString(filters = {}) {
  const params = new URLSearchParams();
  const period = filters.period && ALLOWED_PERIODS.has(filters.period)
    ? filters.period
    : DEFAULT_REPORT_PERIOD;

  params.set('period', period);

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

export function buildReportsFilterSummary(filters, serverFilters = null) {
  const effectiveFilters = serverFilters ?? filters;

  if (!effectiveFilters?.isFiltered) {
    return `Активен период: ${DEFAULT_REPORT_PERIOD_LABEL}.`;
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

function sumBreakdownCounts(items = []) {
  return items.reduce((total, item) => total + Number(item?.count ?? 0), 0);
}

export function buildActivityCards(activity = {}, reports = {}, filters = null) {
  const periodLabel = filters?.label || DEFAULT_REPORT_PERIOD_LABEL;

  return [
    {
      key: 'newAnimals',
      label: 'Нови животни',
      value: activity.newAnimals ?? 0,
      note: periodLabel,
      tone: 'animals',
    },
    {
      key: 'newRequests',
      label: 'Нови заявки за осиновяване',
      value: activity.newRequests ?? 0,
      note: periodLabel,
      tone: 'adoptions',
    },
    {
      key: 'completedAdoptions',
      label: 'Завършени осиновявания',
      value: activity.completedAdoptions ?? 0,
      note: periodLabel,
      tone: 'completed',
    },
    {
      key: 'newRescueReports',
      label: 'Нови сигнали',
      value: sumBreakdownCounts(reports.rescueReportsByStatus),
      note: periodLabel,
      tone: 'reports',
    },
    {
      key: 'newVolunteerApplications',
      label: 'Кандидатури за доброволчество',
      value: sumBreakdownCounts(reports.volunteerApplicationsByStatus),
      note: periodLabel,
      tone: 'volunteers',
    },
    {
      key: 'receivedDonations',
      label: 'Получени дарения',
      value: formatDonationAmount(activity.receivedDonationAmountTotal ?? 0),
      note: `${activity.receivedDonations ?? 0} бр. · ${periodLabel}`,
      tone: 'donations',
    },
  ];
}

export function enrichBreakdown(items = [], kind) {
  const total = items.reduce((sum, item) => sum + (item?.count ?? 0), 0);
  const max = items.reduce((largest, item) => Math.max(largest, item?.count ?? 0), 0);

  return items.map((item) => {
    const count = item.count ?? 0;

    return {
      ...item,
      label: getBreakdownLabel(kind, item.key),
      shareOfTotal: total > 0 ? Math.round((count / total) * 100) : 0,
      widthPercent: count > 0 && max > 0
        ? Math.max(8, Math.round((count / max) * 100))
        : 0,
    };
  });
}

