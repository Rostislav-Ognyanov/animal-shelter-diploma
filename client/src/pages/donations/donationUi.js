export const DONATION_PRESET_AMOUNTS = [20, 50, 100, 200];

export function formatDonationAmount(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return '0,00 €';
  }

  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'EUR',
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

export function buildDonationListQuery(search) {
  const params = new URLSearchParams();

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}
