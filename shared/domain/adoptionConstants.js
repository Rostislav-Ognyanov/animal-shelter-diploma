import { isValidPhone } from './contactValidation.js';

export const ADOPTION_STATUS_VALUES = Object.freeze([
  'pending',
  'under-review',
  'approved',
  'rejected',
  'cancelled',
  'completed',
]);

export const ADOPTION_STATUS_LABELS = Object.freeze({
  pending: 'В очакване',
  'under-review': 'В преглед',
  approved: 'Одобрена',
  rejected: 'Отхвърлена',
  cancelled: 'Отменена',
  completed: 'Завършена',
});

// Status transitions are shared so frontend options and backend enforcement
// use the same adoption rules.
export const ADOPTION_STATUS_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['under-review', 'rejected', 'cancelled']),
  'under-review': Object.freeze(['approved', 'rejected', 'cancelled']),
  approved: Object.freeze(['completed', 'cancelled']),
  rejected: Object.freeze([]),
  cancelled: Object.freeze([]),
  completed: Object.freeze([]),
});

export const ADOPTION_HOUSING_TYPE_VALUES = Object.freeze([
  'apartment',
  'house',
  'other',
]);

export const ADOPTION_HOUSING_TYPE_LABELS = Object.freeze({
  apartment: 'Апартамент',
  house: 'Къща',
  other: 'Друго',
});

export const ADOPTION_YARD_SECURITY_VALUES = Object.freeze([
  'secured',
  'partially-secured',
  'not-secured',
]);

export const ADOPTION_YARD_SECURITY_LABELS = Object.freeze({
  secured: 'Да, дворът е обезопасен',
  'partially-secured': 'Частично обезопасен',
  'not-secured': 'Не е обезопасен',
});

export const ADOPTION_ANIMAL_LIVING_PLACE_VALUES = Object.freeze([
  'indoors',
  'mostly-indoors',
  'secured-yard',
  'other',
]);

export const ADOPTION_ANIMAL_LIVING_PLACE_LABELS = Object.freeze({
  indoors: 'Вътре в дома',
  'mostly-indoors': 'Предимно вътре',
  'secured-yard': 'В обезопасен двор',
  other: 'Друго',
});

export const ADOPTION_ANIMAL_ALLERGY_VALUES = Object.freeze([
  'yes',
  'no',
  'unknown',
]);

export const ADOPTION_ANIMAL_ALLERGY_LABELS = Object.freeze({
  yes: 'Да',
  no: 'Не',
  unknown: 'Не е известно',
});

export const ADOPTION_OTHER_PET_SPECIES_VALUES = Object.freeze([
  'dog',
  'cat',
  'rabbit',
  'bird',
  'other',
]);

export const ADOPTION_OTHER_PET_SPECIES_LABELS = Object.freeze({
  dog: 'Куче',
  cat: 'Котка',
  rabbit: 'Зайче',
  bird: 'Птица',
  other: 'Друго',
});

export const ADOPTION_OTHER_PET_SEX_VALUES = Object.freeze([
  'male',
  'female',
  'unknown',
]);

export const ADOPTION_OTHER_PET_SEX_LABELS = Object.freeze({
  male: 'Мъжки',
  female: 'Женски',
  unknown: 'Не е известно',
});

export const ADOPTION_OTHER_PET_CARE_STATUS_VALUES = Object.freeze([
  'yes',
  'no',
  'not-applicable',
  'unknown',
]);

export const ADOPTION_OTHER_PET_CARE_STATUS_LABELS = Object.freeze({
  yes: 'Да',
  no: 'Не',
  'not-applicable': 'Не е приложимо',
  unknown: 'Не е известно',
});

export const ADOPTION_TRANSPORT_VALUES = Object.freeze([
  'own',
  'can-arrange',
  'none',
]);

export const ADOPTION_TRANSPORT_LABELS = Object.freeze({
  own: 'Със собствен транспорт',
  'can-arrange': 'Може да организира транспорт',
  none: 'Няма осигурен транспорт',
});

export const ADOPTION_MAX_OTHER_PETS = 10;

export const ADOPTION_TEXT_LIMITS = Object.freeze({
  internalNote: 1500,
});

export function isValidAdoptionPhone(value) {
  return isValidPhone(value);
}
