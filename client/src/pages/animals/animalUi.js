const BASE_SPECIES_OPTIONS = [
  { value: 'dog', label: 'Куче' },
  { value: 'cat', label: 'Котка' },
  { value: 'rabbit', label: 'Зайче' },
  { value: 'fox', label: 'Лисица' },
  { value: 'lizard', label: 'Гущер' },
  { value: 'owl', label: 'Сова' },
  { value: 'horse', label: 'Кон' },
  { value: 'hedgehog', label: 'Таралеж' },
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

export const ANIMAL_FILTER_GENDER_OPTIONS = [
  { value: '', label: 'Всички' },
  { value: 'male', label: 'Мъжки' },
  { value: 'female', label: 'Женски' },
];

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
  'under-care': 'Под грижа',
  'protected-care': 'Защитена грижа',
  released: 'Върнато в природата',
  inactive: 'Неактивно',
  archived: 'Архивирано',
};

export const ANIMAL_STATUS_VALUES = Object.keys(ANIMAL_STATUS_LABELS);

export const ANIMAL_FORM_STATUS_OPTIONS = [
  { value: 'available', label: ANIMAL_STATUS_LABELS.available },
  { value: 'reserved', label: ANIMAL_STATUS_LABELS.reserved },
  { value: 'medical-care', label: ANIMAL_STATUS_LABELS['medical-care'] },
  { value: 'under-care', label: ANIMAL_STATUS_LABELS['under-care'] },
  { value: 'protected-care', label: ANIMAL_STATUS_LABELS['protected-care'] },
  { value: 'released', label: ANIMAL_STATUS_LABELS.released },
  { value: 'inactive', label: ANIMAL_STATUS_LABELS.inactive },
  { value: 'archived', label: ANIMAL_STATUS_LABELS.archived },
];

export const ANIMAL_FILTER_STATUS_OPTIONS = [
  { value: '', label: 'Всички статуси' },
  { value: 'available', label: ANIMAL_STATUS_LABELS.available },
  { value: 'reserved', label: ANIMAL_STATUS_LABELS.reserved },
  { value: 'adopted', label: ANIMAL_STATUS_LABELS.adopted },
  { value: 'medical-care', label: ANIMAL_STATUS_LABELS['medical-care'] },
  { value: 'under-care', label: ANIMAL_STATUS_LABELS['under-care'] },
  { value: 'protected-care', label: ANIMAL_STATUS_LABELS['protected-care'] },
  { value: 'released', label: ANIMAL_STATUS_LABELS.released },
  { value: 'inactive', label: ANIMAL_STATUS_LABELS.inactive },
  { value: 'archived', label: ANIMAL_STATUS_LABELS.archived },
];

export const ANIMAL_STATUS_TRANSITIONS = {
  available: ['reserved', 'medical-care', 'under-care', 'protected-care', 'inactive', 'archived'],
  reserved: ['available', 'adopted', 'medical-care', 'under-care', 'protected-care', 'inactive', 'archived'],
  adopted: ['archived'],
  'medical-care': ['available', 'under-care', 'protected-care', 'released', 'inactive', 'archived'],
  'under-care': ['available', 'medical-care', 'protected-care', 'released', 'inactive', 'archived'],
  'protected-care': ['under-care', 'medical-care', 'released', 'inactive', 'archived'],
  released: ['protected-care', 'medical-care', 'archived'],
  inactive: ['available', 'medical-care', 'under-care', 'protected-care', 'archived'],
  archived: [],
};

export const PROTECTED_CARE_SPECIES = new Set(['fox', 'owl', 'hedgehog']);

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
  lizard: 'lizard',
  lizards: 'lizard',
  гущер: 'lizard',
  гущери: 'lizard',
  owl: 'owl',
  owls: 'owl',
  сова: 'owl',
  сови: 'owl',
  horse: 'horse',
  horses: 'horse',
  кон: 'horse',
  коне: 'horse',
  hedgehog: 'hedgehog',
  hedgehogs: 'hedgehog',
  таралеж: 'hedgehog',
  таралежи: 'hedgehog',
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

const GENDER_ALIASES = {
  male: 'male',
  m: 'male',
  мъжки: 'male',
  female: 'female',
  f: 'female',
  женски: 'female',
};
const FILTER_GENDER_VALUE_SET = new Set(['male', 'female']);

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

export function normalizeGenderValue(value) {
  const normalizedValue = normalizeText(value);
  const genderValue = GENDER_ALIASES[normalizedValue] ?? normalizedValue;
  return FILTER_GENDER_VALUE_SET.has(genderValue) ? genderValue : '';
}

export function normalizeAnimalStatusValue(value) {
  const normalizedValue = normalizeText(value);
  return ANIMAL_STATUS_VALUES.includes(normalizedValue) ? normalizedValue : '';
}

export function getAnimalStatusLabel(status) {
  return ANIMAL_STATUS_LABELS[status] ?? status;
}

export function isProtectedCareSpecies(species) {
  return PROTECTED_CARE_SPECIES.has(String(species ?? '').trim().toLowerCase());
}

export function canUseStandardAdoptionFlow(animal) {
  if (!animal) {
    return false;
  }

  if (animal.standardAdoptionEligible !== undefined) {
    return Boolean(animal.standardAdoptionEligible);
  }

  return animal.status === 'available' && !isProtectedCareSpecies(animal.species);
}
