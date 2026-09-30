import {
  ANIMAL_CREATABLE_STATUS_VALUES,
  ANIMAL_GENDER_LABELS,
  ANIMAL_SIZE_LABELS,
  ANIMAL_SIZE_VALUES,
  ANIMAL_SPECIES_LABELS,
  ANIMAL_SPECIES_VALUES,
  ANIMAL_STATUS_LABELS,
  ANIMAL_STATUS_TRANSITIONS,
  ANIMAL_STATUS_VALUES,
  ANIMAL_SYSTEM_MANAGED_STATUS_VALUES,
  PUBLIC_ANIMAL_LIST_STATUS_VALUES,
  PROTECTED_CARE_SPECIES_VALUES,
} from '../../../../shared/domain/animalConstants.js';

const BASE_SPECIES_OPTIONS = ANIMAL_SPECIES_VALUES.map((value) => ({
  value,
  label: ANIMAL_SPECIES_LABELS[value],
}));

const BASE_SIZE_OPTIONS = ANIMAL_SIZE_VALUES.map((value) => ({
  value,
  label: ANIMAL_SIZE_LABELS[value],
}));

export const ANIMAL_SPECIES_OPTIONS = BASE_SPECIES_OPTIONS;
export const ANIMAL_GENDER_OPTIONS = Object.entries(ANIMAL_GENDER_LABELS).map(([value, label]) => ({
  value,
  label,
}));
export const ANIMAL_SIZE_OPTIONS = BASE_SIZE_OPTIONS;

export const ANIMAL_FILTER_GENDER_OPTIONS = [
  { value: '', label: 'Всички' },
  { value: 'male', label: ANIMAL_GENDER_LABELS.male },
  { value: 'female', label: ANIMAL_GENDER_LABELS.female },
  { value: 'unknown', label: ANIMAL_GENDER_LABELS.unknown },
];

export const ANIMAL_FILTER_SPECIES_OPTIONS = [
  { value: '', label: 'Всички видове' },
  ...BASE_SPECIES_OPTIONS,
];

export const ANIMAL_FILTER_SIZE_OPTIONS = [
  { value: '', label: 'Всички размери' },
  ...BASE_SIZE_OPTIONS,
];

export { ANIMAL_STATUS_LABELS, ANIMAL_STATUS_TRANSITIONS, ANIMAL_STATUS_VALUES };

export const ANIMAL_FORM_STATUS_OPTIONS = ANIMAL_CREATABLE_STATUS_VALUES.map((value) => ({
  value,
  label: ANIMAL_STATUS_LABELS[value],
}));

export function getAnimalFormStatusOptions(role) {
  if (role !== 'employee') {
    return ANIMAL_FORM_STATUS_OPTIONS;
  }

  return ANIMAL_FORM_STATUS_OPTIONS.filter(
    (option) => option.value !== 'inactive' && option.value !== 'archived'
  );
}

export const ANIMAL_FILTER_STATUS_OPTIONS = [
  { value: '', label: 'Всички статуси' },
  ...ANIMAL_STATUS_VALUES.map((value) => ({ value, label: ANIMAL_STATUS_LABELS[value] })),
];

export const PUBLIC_ANIMAL_FILTER_STATUS_OPTIONS = [
  { value: '', label: 'Всички' },
  ...PUBLIC_ANIMAL_LIST_STATUS_VALUES.map((value) => ({
    value,
    label: ANIMAL_STATUS_LABELS[value],
  })),
];

export const PROTECTED_CARE_SPECIES = new Set(PROTECTED_CARE_SPECIES_VALUES);

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
  unknown: 'unknown',
  u: 'unknown',
  женски: 'female',
};
const FILTER_GENDER_VALUE_SET = new Set(['male', 'female', 'unknown']);

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

export function getAvailableStatusTransitions(status, role) {
  const transitions = ANIMAL_STATUS_TRANSITIONS[status] ?? [];

  if (role === 'employee' && ['inactive', 'archived'].includes(status)) {
    return [];
  }

  const manualTransitions = transitions.filter((nextStatus) => {
    if (status === 'reserved') {
      return false;
    }

    if (status === 'adopted') {
      return nextStatus === 'archived';
    }

    return !ANIMAL_SYSTEM_MANAGED_STATUS_VALUES.includes(nextStatus);
  });

  if (role === 'employee') {
    return manualTransitions.filter((nextStatus) => nextStatus !== 'inactive' && nextStatus !== 'archived');
  }

  return manualTransitions;
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
