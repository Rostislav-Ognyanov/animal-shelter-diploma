const BASE_SPECIES_OPTIONS = [
  { value: 'dog', label: 'Куче' },
  { value: 'cat', label: 'Котка' },
  { value: 'rabbit', label: 'Зайче' },
  { value: 'fox', label: 'Лисица' },
];

const BASE_SIZE_OPTIONS = [
  { value: 'small', label: 'Малка' },
  { value: 'medium', label: 'Средна' },
  { value: 'large', label: 'Голяма' },
  { value: 'extra-large', label: 'Много голяма' },
];

export const ANIMAL_SPECIES_OPTIONS = BASE_SPECIES_OPTIONS;
export const ANIMAL_GENDER_OPTIONS = [
  { value: 'male', label: 'Мъжки' },
  { value: 'female', label: 'Женски' },
  { value: 'unknown', label: 'Неуточнен' },
];
export const ANIMAL_SIZE_OPTIONS = BASE_SIZE_OPTIONS;

export const ANIMAL_FILTER_SPECIES_OPTIONS = [
  { value: '', label: 'Всички видове' },
  ...BASE_SPECIES_OPTIONS,
];

export const ANIMAL_FILTER_SIZE_OPTIONS = [
  { value: '', label: 'Всички размери' },
  ...BASE_SIZE_OPTIONS,
];

export const ANIMAL_STATUS_LABELS = {
  available: 'Готово за осиновяване',
  reserved: 'Резервирано',
  adopted: 'Осиновено',
  'medical-care': 'Медицинска грижа',
  inactive: 'Неактивно',
  archived: 'Архивирано',
};

export const ANIMAL_STATUS_VALUES = Object.keys(ANIMAL_STATUS_LABELS);

export const ANIMAL_FORM_STATUS_OPTIONS = [
  { value: 'available', label: ANIMAL_STATUS_LABELS.available },
  { value: 'reserved', label: ANIMAL_STATUS_LABELS.reserved },
  { value: 'medical-care', label: ANIMAL_STATUS_LABELS['medical-care'] },
  { value: 'inactive', label: ANIMAL_STATUS_LABELS.inactive },
  { value: 'archived', label: ANIMAL_STATUS_LABELS.archived },
];

export const ANIMAL_FILTER_STATUS_OPTIONS = [
  { value: '', label: 'Всички статуси' },
  { value: 'available', label: ANIMAL_STATUS_LABELS.available },
  { value: 'reserved', label: ANIMAL_STATUS_LABELS.reserved },
  { value: 'adopted', label: ANIMAL_STATUS_LABELS.adopted },
  { value: 'medical-care', label: ANIMAL_STATUS_LABELS['medical-care'] },
  { value: 'inactive', label: ANIMAL_STATUS_LABELS.inactive },
  { value: 'archived', label: ANIMAL_STATUS_LABELS.archived },
];

export const ANIMAL_STATUS_TRANSITIONS = {
  available: ['reserved', 'medical-care', 'inactive', 'archived'],
  reserved: ['available', 'adopted', 'medical-care', 'inactive', 'archived'],
  adopted: ['archived'],
  'medical-care': ['available', 'inactive', 'archived'],
  inactive: ['available', 'medical-care', 'archived'],
  archived: [],
};

const SPECIES_ALIASES = {
  dog: 'dog',
  dogs: 'dog',
  куче: 'dog',
  кучета: 'dog',
  cat: 'cat',
  cats: 'cat',
  котка: 'cat',
  котки: 'cat',
  rabbit: 'rabbit',
  rabbits: 'rabbit',
  заек: 'rabbit',
  зайче: 'rabbit',
  зайци: 'rabbit',
  fox: 'fox',
  foxes: 'fox',
  лисица: 'fox',
  лисици: 'fox',
};

const SIZE_ALIASES = {
  small: 'small',
  s: 'small',
  's size': 'small',
  малка: 'small',
  medium: 'medium',
  m: 'medium',
  'm size': 'medium',
  средна: 'medium',
  large: 'large',
  l: 'large',
  'l size': 'large',
  голяма: 'large',
  'extra-large': 'extra-large',
  'extra large': 'extra-large',
  xl: 'extra-large',
  'xl size': 'extra-large',
  'много голяма': 'extra-large',
};

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeSpeciesValue(value) {
  const normalizedValue = normalizeText(value);
  return SPECIES_ALIASES[normalizedValue] ?? normalizedValue;
}

export function normalizeSizeValue(value) {
  const normalizedValue = normalizeText(value);
  return SIZE_ALIASES[normalizedValue] ?? normalizedValue;
}

export function normalizeAnimalStatusValue(value) {
  const normalizedValue = normalizeText(value);
  return ANIMAL_STATUS_VALUES.includes(normalizedValue) ? normalizedValue : '';
}

export function getAnimalStatusLabel(status) {
  return ANIMAL_STATUS_LABELS[status] ?? status;
}
