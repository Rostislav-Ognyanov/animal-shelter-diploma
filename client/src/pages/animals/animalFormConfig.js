import {
  ANIMAL_GENDER_OPTIONS,
  ANIMAL_SIZE_OPTIONS,
  ANIMAL_SPECIES_OPTIONS,
} from './animalUi.js';
import {
  ANIMAL_GENDER_VALUES,
  ANIMAL_IMAGE_DATA_MIME_TYPES,
  ANIMAL_IMAGE_MAX_BYTES,
  ANIMAL_IMAGE_MAX_COUNT,
  ANIMAL_IMAGE_MAX_TOTAL_BYTES,
  ANIMAL_IMAGE_URL_MAX_LENGTH,
  ANIMAL_SIZE_VALUES,
  ANIMAL_SPECIES_VALUES,
  ANIMAL_STATUS_VALUES,
  ANIMAL_TEXT_LIMITS,
} from '../../../../shared/domain/animalConstants.js';
import { buildAnimalStoredNames, getAnimalFormNameValue } from './animalNameTransform.js';

export const SPECIES_OPTIONS = ANIMAL_SPECIES_OPTIONS;
export const GENDER_OPTIONS = ANIMAL_GENDER_OPTIONS;
export const SIZE_OPTIONS = ANIMAL_SIZE_OPTIONS;
export const ANIMAL_FORM_VALIDATION_MESSAGE = 'Моля, коригирай отбелязаните полета преди запис.';

const INITIAL_ANIMAL_FORM_VALUES = {
  name: '',
  species: '',
  breed: '',
  age: '',
  gender: '',
  size: '',
  status: '',
  intakeDate: '',
  healthStatus: '',
  vaccinated: false,
  neutered: false,
  description: '',
  story: '',
  historyAndCharacter: '',
  details: '',
  careConditions: '',
  imageUrlsText: '',
};

function parseImageUrlsText(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getBase64ByteLength(base64Value) {
  const normalizedValue = String(base64Value ?? '').replace(/\s/g, '');
  const paddingLength = normalizedValue.endsWith('==')
    ? 2
    : normalizedValue.endsWith('=')
      ? 1
      : 0;

  return Math.floor((normalizedValue.length * 3) / 4) - paddingLength;
}

function parseDataImageUrl(imageUrl) {
  const dataUrlMatch = String(imageUrl ?? '').match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);

  if (!dataUrlMatch) {
    return null;
  }

  return {
    mimeType: dataUrlMatch[1].toLowerCase(),
    byteLength: getBase64ByteLength(dataUrlMatch[2]),
  };
}

function isAllowedStoredImagePath(imageUrl) {
  return /^https:\/\//i.test(imageUrl) || /^images\//i.test(imageUrl);
}

function validateTextLimit(values, errors, fieldName, label) {
  const limit = ANIMAL_TEXT_LIMITS[fieldName];
  const text = String(values[fieldName] ?? '').trim();

  if (text.length > limit) {
    errors[fieldName] = `${label} може да бъде най-много ${limit} символа.`;
  }
}

function validateImageUrls(imageUrls) {
  if (imageUrls.length > ANIMAL_IMAGE_MAX_COUNT) {
    return `Можеш да добавиш най-много ${ANIMAL_IMAGE_MAX_COUNT} снимки.`;
  }

  let totalEmbeddedImageBytes = 0;

  for (const imageUrl of imageUrls) {
    const dataImage = parseDataImageUrl(imageUrl);

    if (/^data:/i.test(imageUrl)) {
      if (!dataImage || !ANIMAL_IMAGE_DATA_MIME_TYPES.includes(dataImage.mimeType)) {
        return 'Качените снимки трябва да бъдат JPEG, PNG или WebP image data URL стойности.';
      }

      if (dataImage.byteLength > ANIMAL_IMAGE_MAX_BYTES) {
        return `Всяка снимка трябва да бъде до ${Math.floor(ANIMAL_IMAGE_MAX_BYTES / 1024 / 1024)} MB.`;
      }

      totalEmbeddedImageBytes += dataImage.byteLength;
      continue;
    }

    if (!isAllowedStoredImagePath(imageUrl)) {
      return 'Снимките трябва да бъдат HTTPS адреси, локални images пътища или image data URL стойности.';
    }

    if (imageUrl.length > ANIMAL_IMAGE_URL_MAX_LENGTH) {
      return `Адресът на снимка може да бъде най-много ${ANIMAL_IMAGE_URL_MAX_LENGTH} символа.`;
    }
  }

  if (totalEmbeddedImageBytes > ANIMAL_IMAGE_MAX_TOTAL_BYTES) {
    return `Общият размер на качените снимки трябва да бъде до ${Math.floor(ANIMAL_IMAGE_MAX_TOTAL_BYTES / 1024 / 1024)} MB.`;
  }

  return '';
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

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (parsedDate > todayEnd) {
    throw new Error('Датата на приемане не може да бъде бъдеща дата.');
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

  validateTextLimit(values, errors, 'name', 'Името');

  if (!ANIMAL_SPECIES_VALUES.includes(values.species)) {
    errors.species = 'Избери вид.';
  }

  if (!String(values.breed ?? '').trim()) {
    errors.breed = 'Породата е задължителна.';
  }

  validateTextLimit(values, errors, 'breed', 'Породата');

  if (!String(values.age ?? '').trim()) {
    errors.age = 'Възрастта е задължителна.';
  } else {
    const numericAge = Number(values.age);

    if (!Number.isFinite(numericAge) || numericAge < 0) {
      errors.age = 'Възрастта трябва да бъде неотрицателно число.';
    }
  }

  if (!ANIMAL_GENDER_VALUES.includes(values.gender)) {
    errors.gender = 'Избери пол.';
  }

  if (!ANIMAL_SIZE_VALUES.includes(values.size)) {
    errors.size = 'Избери големина.';
  }

  if (!ANIMAL_STATUS_VALUES.includes(values.status)) {
    errors.status = 'Избери статус.';
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

  validateTextLimit(values, errors, 'healthStatus', 'Здравният статус');

  if (!String(values.description ?? '').trim()) {
    errors.description = 'Описанието е задължително.';
  }

  validateTextLimit(values, errors, 'description', 'Описанието');
  validateTextLimit(values, errors, 'story', 'Историята');
  validateTextLimit(values, errors, 'historyAndCharacter', 'Историята и характерът');
  validateTextLimit(values, errors, 'details', 'Основната информация');
  validateTextLimit(values, errors, 'careConditions', 'Условията за отглеждане');

  const imageUrls = parseImageUrlsText(values.imageUrlsText);

  if (values.imageUrlsText && imageUrls.length === 0) {
    errors.imageUrlsText = 'Ако попълваш снимки, добави поне един валиден адрес или път.';
  } else {
    const imageError = validateImageUrls(imageUrls);

    if (imageError) {
      errors.imageUrlsText = imageError;
    }
  }

  return errors;
}

export function buildAnimalPayload(values, { includeStatus = true } = {}) {
  const normalizedName = buildAnimalStoredNames(values.name);

  const payload = {
    name: normalizedName.name,
    displayName: normalizedName.displayName,
    species: values.species,
    breed: String(values.breed ?? '').trim(),
    age: Number(values.age),
    gender: values.gender,
    size: values.size,
    intakeDate: parseFormDateToIso(values.intakeDate),
    healthStatus: String(values.healthStatus ?? '').trim(),
    vaccinated: values.vaccinated,
    neutered: values.neutered,
    description: String(values.description ?? '').trim(),
    story: String(values.story ?? '').trim(),
    historyAndCharacter: String(values.historyAndCharacter ?? '').trim(),
    details: String(values.details ?? '').trim(),
    careConditions: String(values.careConditions ?? '').trim(),
    imageUrls: parseImageUrlsText(values.imageUrlsText),
  };

  if (includeStatus) {
    payload.status = values.status;
  }

  return payload;
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
    intakeDate: formatDateForForm(animal?.intakeDate),
    healthStatus: animal?.healthStatus ?? '',
    vaccinated: Boolean(animal?.vaccinated),
    neutered: Boolean(animal?.neutered),
    description: animal?.description ?? '',
    story: animal?.story ?? '',
    historyAndCharacter: animal?.historyAndCharacter ?? '',
    details: animal?.details ?? '',
    careConditions: animal?.careConditions ?? '',
    imageUrlsText: imageUrls.join('\n'),
  };
}
