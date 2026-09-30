export const RESCUE_REPORT_STATUS_VALUES = Object.freeze([
  'pending',
  'under-review',
  'accepted',
  'resolved',
  'rejected',
]);

export const RESCUE_REPORT_STATUS_LABELS = Object.freeze({
  pending: 'В очакване',
  'under-review': 'В преглед',
  accepted: 'Приет',
  resolved: 'Решен',
  rejected: 'Отхвърлен',
});

// Reports cannot jump directly to resolved, keeping the staff handling path explicit.
export const RESCUE_REPORT_STATUS_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['under-review', 'accepted', 'rejected']),
  'under-review': Object.freeze(['accepted', 'rejected']),
  accepted: Object.freeze(['resolved']),
  resolved: Object.freeze([]),
  rejected: Object.freeze([]),
});

export const RESCUE_REPORT_URGENCY_VALUES = Object.freeze([
  'low',
  'medium',
  'high',
  'critical',
]);

export const RESCUE_REPORT_URGENCY_LABELS = Object.freeze({
  low: 'Ниска',
  medium: 'Средна',
  high: 'Висока',
  critical: 'Критична',
});

export const RESCUE_REPORT_SPECIES_VALUES = Object.freeze([
  'dog',
  'cat',
  'rabbit',
  'fox',
  'lizard',
  'owl',
  'horse',
  'hedgehog',
  'bird',
  'other',
]);

export const RESCUE_REPORT_SPECIES_LABELS = Object.freeze({
  dog: 'Куче',
  cat: 'Котка',
  rabbit: 'Зайче',
  fox: 'Лисица',
  lizard: 'Гущер',
  owl: 'Сова',
  horse: 'Кон',
  hedgehog: 'Таралеж',
  bird: 'Птица',
  other: 'Друго',
});

export const RESCUE_REPORT_IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
export const RESCUE_REPORT_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const RESCUE_REPORT_IMAGE_MAX_DATA_URL_LENGTH =
  Math.ceil((RESCUE_REPORT_IMAGE_MAX_BYTES * 4) / 3) + 100;

export const RESCUE_REPORT_TEXT_LIMITS = Object.freeze({
  name: 120,
  email: 254,
  phone: 32,
  location: 300,
  description: 3000,
  internalNote: 1500,
  authorName: 161,
});
