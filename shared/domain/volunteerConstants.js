export const VOLUNTEER_STATUS_VALUES = Object.freeze([
  'pending',
  'under-review',
  'approved',
  'rejected',
]);

export const ACTIVE_VOLUNTEER_STATUS_VALUES = Object.freeze([
  'pending',
  'under-review',
]);

export const VOLUNTEER_STATUS_LABELS = Object.freeze({
  pending: 'В очакване',
  'under-review': 'В преглед',
  approved: 'Одобрена',
  rejected: 'Отхвърлена',
});

// Volunteer applications must pass through review before a final decision is recorded.
export const VOLUNTEER_STATUS_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['under-review']),
  'under-review': Object.freeze(['approved', 'rejected']),
  approved: Object.freeze([]),
  rejected: Object.freeze([]),
});

export const VOLUNTEER_POSITION_VALUES = Object.freeze([
  'animal-care',
  'cleaning',
  'walking',
  'transport',
  'admin-support',
  'events-campaigns',
  'other',
]);

export const VOLUNTEER_POSITION_LABELS = Object.freeze({
  'animal-care': 'Грижа за животни',
  cleaning: 'Почистване',
  walking: 'Разходка',
  transport: 'Транспорт',
  'admin-support': 'Административна помощ',
  'events-campaigns': 'Събития и кампании',
  other: 'Друго',
});

export const MIN_VOLUNTEER_AGE = 14;
export const MAX_VOLUNTEER_AGE = 120;

export const VOLUNTEER_TEXT_LIMITS = Object.freeze({
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 32,
  guardianName: 120,
  guardianContact: 254,
  otherPosition: 120,
  availability: 300,
  motivation: 1000,
  experience: 1500,
  internalNote: 1500,
});
