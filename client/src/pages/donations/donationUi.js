import {
  DONATION_CURRENCY,
  DONATION_STATUS_LABELS,
  DONATION_STATUS_TRANSITIONS,
  DONATION_STATUS_VALUES,
} from '../../../../shared/domain/donationConstants.js';
import { isTerminalWorkflowStatus } from '../../../../shared/domain/workflowStatus.js';

export const DONATION_PRESET_AMOUNTS = [20, 50, 100, 200];

export const DONATION_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Всички статуси' },
  ...DONATION_STATUS_VALUES.map((status) => ({
    value: status,
    label: DONATION_STATUS_LABELS[status] ?? status,
  })),
];

export function getDonationStatusLabel(status) {
  return DONATION_STATUS_LABELS[status] ?? 'Заявено';
}

export function getDonationStatusTransitions(status) {
  return [...(DONATION_STATUS_TRANSITIONS[status] ?? [])];
}

export function isDonationTerminalStatus(status) {
  return isTerminalWorkflowStatus(status, DONATION_STATUS_TRANSITIONS);
}

export function formatDonationAmount(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return '0,00 €';
  }

  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: DONATION_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatDonationDate(dateValue) {
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

export function getDonationDisplayName(donation) {
  return donation?.name?.trim() || 'Дарител';
}

export function getDonationManagementPath(role) {
  return role === 'admin' ? '/admin/donations' : '/staff/donations';
}

export function buildDonationListQuery(search, page, limit, status = '') {
  const params = new URLSearchParams();

  if (status?.trim()) {
    params.set('status', status.trim());
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
