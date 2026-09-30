export const DONATION_STATUS_VALUES = Object.freeze([
  'pledged',
  'confirmed',
  'received',
  'cancelled',
]);

export const DONATION_CURRENCY = 'EUR';

export const DONATION_STATUS_LABELS = Object.freeze({
  pledged: 'Заявено',
  confirmed: 'Потвърдено',
  received: 'Получено',
  cancelled: 'Отказано',
});

export const DONATION_STATUS_TRANSITIONS = Object.freeze({
  pledged: Object.freeze(['confirmed', 'cancelled']),
  confirmed: Object.freeze(['received', 'cancelled']),
  received: Object.freeze([]),
  cancelled: Object.freeze([]),
});

export const DONATION_TEXT_LIMITS = Object.freeze({
  name: 120,
  email: 254,
  phone: 32,
  message: 1500,
});

export const DONATION_AMOUNT_LIMITS = Object.freeze({
  min: 1,
  max: 100000,
  minCents: 100,
  maxCents: 10000000,
});
