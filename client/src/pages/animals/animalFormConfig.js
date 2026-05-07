import {
  ANIMAL_FORM_STATUS_OPTIONS,
  ANIMAL_GENDER_OPTIONS,
  ANIMAL_SIZE_OPTIONS,
  ANIMAL_SPECIES_OPTIONS,
} from './animalUi.js';

export const SPECIES_OPTIONS = ANIMAL_SPECIES_OPTIONS;
export const GENDER_OPTIONS = ANIMAL_GENDER_OPTIONS;
export const SIZE_OPTIONS = ANIMAL_SIZE_OPTIONS;
export const STATUS_OPTIONS = ANIMAL_FORM_STATUS_OPTIONS;

export const ANIMAL_FORM_VALIDATION_MESSAGE = 'Моля, коригирай отбелязаните полета преди запис.';

const INITIAL_ANIMAL_FORM_VALUES = {
  name: '',
  displayName: '',
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

export function getInitialAnimalFormValues() {
  return {
    ...INITIAL_ANIMAL_FORM_VALUES,
  };
}

export function validateAnimalForm(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = 'Името е задължително.';
  }

  if (!values.breed.trim()) {
    errors.breed = 'Породата е задължителна.';
  }

  if (!String(values.age).trim()) {
    errors.age = 'Възрастта е задължителна.';
  } else {
    const numericAge = Number(values.age);

    if (!Number.isFinite(numericAge) || numericAge < 0) {
      errors.age = 'Възрастта трябва да бъде неотрицателно число.';
    }
  }

  if (!values.intakeDate) {
    errors.intakeDate = 'Датата на приемане е задължителна.';
  }

  if (!values.healthStatus.trim()) {
    errors.healthStatus = 'Здравният статус е задължителен.';
  }

  if (!values.description.trim()) {
    errors.description = 'Описанието е задължително.';
  }

  if (values.imageUrlsText && parseImageUrlsText(values.imageUrlsText).length === 0) {
    errors.imageUrlsText = 'Ако попълваш снимки, добави поне един валиден адрес или път.';
  }

  return errors;
}

export function buildAnimalPayload(values) {
  return {
    name: values.name.trim(),
    displayName: values.displayName.trim(),
    species: values.species,
    breed: values.breed.trim(),
    age: Number(values.age),
    gender: values.gender,
    size: values.size,
    status: values.status,
    isActive: Boolean(values.isActive),
    intakeDate: values.intakeDate,
    healthStatus: values.healthStatus.trim(),
    vaccinated: values.vaccinated,
    neutered: values.neutered,
    description: values.description.trim(),
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
    name: animal?.name ?? '',
    displayName: animal?.displayName ?? '',
    species: animal?.species ?? 'dog',
    breed: animal?.breed ?? '',
    age: animal?.age !== undefined && animal?.age !== null ? String(animal.age) : '',
    gender: animal?.gender ?? 'unknown',
    size: animal?.size ?? 'medium',
    status: animal?.status ?? 'available',
    isActive: animal?.isActive ?? true,
    intakeDate: animal?.intakeDate ? String(animal.intakeDate).slice(0, 10) : '',
    healthStatus: animal?.healthStatus ?? '',
    vaccinated: Boolean(animal?.vaccinated),
    neutered: Boolean(animal?.neutered),
    description: animal?.description ?? '',
    imageUrlsText: imageUrls.join('\n'),
  };
}
