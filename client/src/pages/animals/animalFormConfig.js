import {
  ANIMAL_FORM_STATUS_OPTIONS,
  ANIMAL_GENDER_OPTIONS,
  ANIMAL_SIZE_OPTIONS,
  ANIMAL_SPECIES_OPTIONS,
} from './animalUi.js';
import { buildAnimalStoredNames, getAnimalFormNameValue } from './animalNameTransform.js';

export const SPECIES_OPTIONS = ANIMAL_SPECIES_OPTIONS;
export const GENDER_OPTIONS = ANIMAL_GENDER_OPTIONS;
export const SIZE_OPTIONS = ANIMAL_SIZE_OPTIONS;
export const STATUS_OPTIONS = ANIMAL_FORM_STATUS_OPTIONS;

export const ANIMAL_FORM_VALIDATION_MESSAGE = 'Моля, коригирай отбелязаните полета преди запис.';

const INITIAL_ANIMAL_FORM_VALUES = {
  name: '',
  species: 'dog',
  breed: '',
  age: '',
  gender: 'unknown',
  size: 'medium',
  status: 'available',
  isActive: true,
  intakeDate: '',
  healthStatus: '',
  vaccinated: false,
  neutered: false,
  description: '',
  imageUrlsText: '',
};

function parseImageUrlsText(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatDateForForm(value) {
  if (!value) {
    return '';
  }

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return '';
  }

  const day = String(dateValue.getDate()).padStart(2, '0');
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const year = String(dateValue.getFullYear());

  return `${day}/${month}/${year}`;
}

function parseFormDateToIso(value) {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    throw new Error('Датата на приемане е задължителна.');
  }

  const dateMatch = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!dateMatch) {
    throw new Error('Въведи дата във формат dd/mm/yyyy.');
  }

  const [, day, month, year] = dateMatch;
  const isoDate = `${year}-${month}-${day}T00:00:00.000Z`;
  const parsedDate = new Date(isoDate);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() + 1 !== Number(month) ||
    parsedDate.getUTCDate() !== Number(day)
  ) {
    throw new Error('Въведи валидна дата във формат dd/mm/yyyy.');
  }

  return isoDate;
}

export function getInitialAnimalFormValues() {
  return {
    ...INITIAL_ANIMAL_FORM_VALUES,
  };
}

export function validateAnimalForm(values) {
  const errors = {};

  if (!String(values.name ?? '').trim()) {
    errors.name = 'Името е задължително.';
  }

  if (!String(values.breed ?? '').trim()) {
    errors.breed = 'Породата е задължителна.';
  }

  if (!String(values.age ?? '').trim()) {
    errors.age = 'Възрастта е задължителна.';
  } else {
    const numericAge = Number(values.age);

    if (!Number.isFinite(numericAge) || numericAge < 0) {
      errors.age = 'Възрастта трябва да бъде неотрицателно число.';
    }
  }

  if (!values.intakeDate) {
    errors.intakeDate = 'Датата на приемане е задължителна.';
  } else {
    try {
      parseFormDateToIso(values.intakeDate);
    } catch (error) {
      errors.intakeDate = error.message;
    }
  }

  if (!String(values.healthStatus ?? '').trim()) {
    errors.healthStatus = 'Здравният статус е задължителен.';
  }

  if (!String(values.description ?? '').trim()) {
    errors.description = 'Описанието е задължително.';
  }

  if (values.imageUrlsText && parseImageUrlsText(values.imageUrlsText).length === 0) {
    errors.imageUrlsText = 'Ако попълваш снимки, добави поне един валиден адрес или път.';
  }

  return errors;
}

export function buildAnimalPayload(values) {
  const normalizedName = buildAnimalStoredNames(values.name);

  return {
    name: normalizedName.name,
    displayName: normalizedName.displayName,
    species: values.species,
    breed: String(values.breed ?? '').trim(),
    age: Number(values.age),
    gender: values.gender,
    size: values.size,
    status: values.status,
    isActive: Boolean(values.isActive),
    intakeDate: parseFormDateToIso(values.intakeDate),
    healthStatus: String(values.healthStatus ?? '').trim(),
    vaccinated: values.vaccinated,
    neutered: values.neutered,
    description: String(values.description ?? '').trim(),
    imageUrls: parseImageUrlsText(values.imageUrlsText),
  };
}

export function mapAnimalToFormValues(animal) {
  const imageUrls = Array.isArray(animal?.imageUrls)
    ? animal.imageUrls
    : animal?.imageUrl
      ? [animal.imageUrl]
      : [];

  return {
    name: getAnimalFormNameValue(animal),
    species: animal?.species ?? 'dog',
    breed: animal?.breed ?? '',
    age: animal?.age !== undefined && animal?.age !== null ? String(animal.age) : '',
    gender: animal?.gender ?? 'unknown',
    size: animal?.size ?? 'medium',
    status: animal?.status ?? 'available',
    isActive: animal?.isActive ?? true,
    intakeDate: formatDateForForm(animal?.intakeDate),
    healthStatus: animal?.healthStatus ?? '',
    vaccinated: Boolean(animal?.vaccinated),
    neutered: Boolean(animal?.neutered),
    description: animal?.description ?? '',
    imageUrlsText: imageUrls.join('\n'),
  };
}
