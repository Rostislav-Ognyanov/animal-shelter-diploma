import mongoose from 'mongoose';

import Animal from '../../models/Animal.js';
import Favorite from '../../models/Favorite.js';
import { createHttpError } from '../../utils/httpError.js';
import { createDuplicateKeyHttpError } from '../../utils/mongoErrors.js';
import {
  applyPagination,
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { normalizeDateOutput } from '../../utils/serialization.js';
import {
  ANIMAL_CREATABLE_STATUS_VALUES,
  ANIMAL_GENDER_LABELS,
  ANIMAL_GENDER_VALUES,
  ANIMAL_IMAGE_DATA_MIME_TYPES,
  ANIMAL_IMAGE_MAX_BYTES,
  ANIMAL_IMAGE_MAX_COUNT,
  ANIMAL_IMAGE_MAX_TOTAL_BYTES,
  ANIMAL_IMAGE_URL_MAX_LENGTH,
  ANIMAL_ID_SLUG_PATTERN,
  ANIMAL_MANUAL_STATUS_VALUES,
  ANIMAL_SIZE_LABELS,
  ANIMAL_SIZE_VALUES,
  ANIMAL_SPECIES_LABELS,
  ANIMAL_SPECIES_VALUES,
  ANIMAL_SORT_VALUES,
  ANIMAL_STATUS_TRANSITIONS,
  ANIMAL_STATUS_LABELS,
  ANIMAL_STATUS_VALUES,
  ANIMAL_SYSTEM_MANAGED_STATUS_VALUES,
  ANIMAL_TEXT_LIMITS,
  PUBLIC_ANIMAL_LIST_STATUS_VALUES,
  PROTECTED_CARE_SPECIES_VALUES,
} from './animal.constants.js';
import {
  CYRILLIC_TO_LATIN_MAP,
  GENDER_ALIASES,
  SEARCH_ALIASES,
  SIZE_ALIASES,
  SPECIES_ALIASES,
} from './animal.search.constants.js';
import { hasPermission } from '../shared/rolePolicies.js';

const INACTIVE_ANIMAL_STATUSES = new Set(['inactive', 'archived']);
const DEACTIVATE_PERMISSION_STATUSES = new Set(['inactive', 'archived']);
const SYSTEM_MANAGED_ANIMAL_STATUSES = new Set(ANIMAL_SYSTEM_MANAGED_STATUS_VALUES);
const PROTECTED_CARE_SPECIES = new Set(PROTECTED_CARE_SPECIES_VALUES);
const PUBLIC_ANIMAL_LIST_STATUSES = new Set(PUBLIC_ANIMAL_LIST_STATUS_VALUES);
const CREATE_ANIMAL_ALLOWED_FIELDS = [
  'slug',
  'name',
  'displayName',
  'species',
  'breed',
  'age',
  'gender',
  'size',
  'status',
  'intakeDate',
  'healthStatus',
  'vaccinated',
  'neutered',
  'description',
  'story',
  'historyAndCharacter',
  'details',
  'careConditions',
  'imageUrls',
];
const UPDATE_ANIMAL_ALLOWED_FIELDS = CREATE_ANIMAL_ALLOWED_FIELDS.filter(
  (fieldName) => !['slug', 'status'].includes(fieldName)
);
const ANIMAL_STATUS_UPDATE_ALLOWED_FIELDS = ['status'];
const ANIMAL_DEACTIVATE_ALLOWED_FIELDS = ['status'];
const ANIMAL_SORT_VALUE_BY_NORMALIZED_VALUE = ANIMAL_SORT_VALUES.reduce((sortMap, sortValue) => {
  sortMap[sortValue.toLowerCase()] = sortValue;
  return sortMap;
}, {});

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeDisplayText(value) {
  return String(value ?? '').trim();
}

function normalizeLimitedDisplayText(value, fieldName, maxLength, { required = false } = {}) {
  const text = normalizeDisplayText(value);

  if (required && !text) {
    throw createHttpError(400, `Полето "${fieldName}" е задължително.`);
  }

  if (text.length > maxLength) {
    throw createHttpError(400, `Полето "${fieldName}" може да бъде най-много ${maxLength} символа.`);
  }

  return text;
}

function normalizeStoredAssetPath(value) {
  const normalizedValue = normalizeDisplayText(value);

  if (/^(?:data:|https:)/i.test(normalizedValue)) {
    return normalizedValue;
  }

  return normalizedValue.replace(/^\/+/, '');
}

function normalizeLookupAnimalId(animalId) {
  return String(animalId ?? '').trim().toLowerCase();
}

function transliterateToLatin(value) {
  return String(value ?? '')
    .toLowerCase()
    .split('')
    .map((character) => CYRILLIC_TO_LATIN_MAP[character] ?? character)
    .join('');
}

function slugify(value) {
  const transliteratedValue = transliterateToLatin(value);

  return transliteratedValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeSpecies(value) {
  const normalizedValue = normalizeText(value);
  return SPECIES_ALIASES[normalizedValue] ?? normalizedValue;
}

function normalizeSize(value) {
  const normalizedValue = normalizeText(value);
  return SIZE_ALIASES[normalizedValue] ?? normalizedValue;
}

function normalizeGender(value) {
  const normalizedValue = normalizeText(value);
  return GENDER_ALIASES[normalizedValue] ?? normalizedValue;
}

function getSearchTerms(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return [];
  }

  const transliteratedValue = normalizeText(transliterateToLatin(normalizedValue));
  return [...new Set([normalizedValue, transliteratedValue].filter(Boolean))];
}

function searchTermsMatchValue(value, searchTerms) {
  const valueTerms = getSearchTerms(value);

  return valueTerms.some((valueTerm) =>
    searchTerms.some((searchTerm) => valueTerm.includes(searchTerm))
  );
}

function searchAliasesMatch(aliasValues, searchTerms) {
  return aliasValues.some((aliasValue) => searchTermsMatchValue(aliasValue, searchTerms));
}

function getSpeciesSearchAliases(species) {
  const normalizedSpecies = normalizeSpecies(species);
  return SEARCH_ALIASES.species[normalizedSpecies] ?? [];
}

function getBreedSearchAliases(species, breed) {
  const normalizedSpecies = normalizeSpecies(species);
  const normalizedBreed = normalizeText(breed);
  return SEARCH_ALIASES.breeds[normalizedSpecies]?.[normalizedBreed] ?? [];
}

function getSpeciesValuesMatchingAliasSearch(searchTerms) {
  return ANIMAL_SPECIES_VALUES.filter((species) =>
    searchAliasesMatch(getSpeciesSearchAliases(species), searchTerms)
  );
}

function getBreedValuesMatchingAliasSearch(searchTerms) {
  const matches = [];

  Object.entries(SEARCH_ALIASES.breeds).forEach(([species, breedAliases]) => {
    Object.entries(breedAliases).forEach(([breed, aliases]) => {
      if (searchAliasesMatch(aliases, searchTerms)) {
        matches.push({ species, breed });
      }
    });
  });

  return matches;
}

function searchTermsMatchEnumValue(enumValue, enumLabel, searchTerms) {
  const enumValueTerms = getSearchTerms(enumValue);
  const enumLabelTerms = getSearchTerms(enumLabel);
  const matchesCanonicalValue = enumValueTerms.some((enumValueTerm) =>
    searchTerms.includes(enumValueTerm)
  );
  const matchesVisibleLabel = enumLabelTerms.some((enumLabelTerm) =>
    searchTerms.some((searchTerm) => enumLabelTerm.includes(searchTerm))
  );

  return matchesCanonicalValue || matchesVisibleLabel;
}

function getEnumValuesMatchingSearch(searchTerms, enumValues, enumLabels) {
  return enumValues.filter((enumValue) =>
    searchTermsMatchEnumValue(enumValue, enumLabels[enumValue], searchTerms)
  );
}

function buildMongoSearchConditions(searchTerms) {
  const regexValues = searchTerms.map((searchTerm) => new RegExp(escapeRegex(searchTerm), 'i'));
  const searchableTextFields = ['name', 'displayName', 'slug', 'breed'];
  const searchConditions = regexValues.flatMap((regex) =>
    searchableTextFields.map((field) => ({ [field]: regex }))
  );
  const speciesValues = [
    ...new Set([
      ...getEnumValuesMatchingSearch(searchTerms, ANIMAL_SPECIES_VALUES, ANIMAL_SPECIES_LABELS),
      ...getSpeciesValuesMatchingAliasSearch(searchTerms),
    ]),
  ];
  const breedValues = getBreedValuesMatchingAliasSearch(searchTerms);
  const genderValues = getEnumValuesMatchingSearch(searchTerms, ANIMAL_GENDER_VALUES, ANIMAL_GENDER_LABELS);
  const sizeValues = getEnumValuesMatchingSearch(searchTerms, ANIMAL_SIZE_VALUES, ANIMAL_SIZE_LABELS);
  const statusValues = getEnumValuesMatchingSearch(searchTerms, ANIMAL_STATUS_VALUES, ANIMAL_STATUS_LABELS);

  if (speciesValues.length > 0) {
    searchConditions.push({ species: { $in: speciesValues } });
  }

  breedValues.forEach(({ species, breed }) => {
    searchConditions.push({
      species,
      breed: new RegExp(`^${escapeRegex(breed)}$`, 'i'),
    });
  });

  if (genderValues.length > 0) {
    searchConditions.push({ gender: { $in: genderValues } });
  }

  if (sizeValues.length > 0) {
    searchConditions.push({ size: { $in: sizeValues } });
  }

  if (statusValues.length > 0) {
    searchConditions.push({ status: { $in: statusValues } });
  }

  return searchConditions;
}

function formatAnimalAge(ageValue) {
  const numericAge = Number(ageValue ?? 0);

  if (!Number.isFinite(numericAge) || numericAge < 0) {
    return 'Неуточнена възраст';
  }

  const ageInMonths = Math.round(numericAge * 12);

  if (ageInMonths < 12) {
    return String(ageInMonths) + ' ' + (ageInMonths === 1 ? 'месец' : 'месеца');
  }

  const years = Math.floor(ageInMonths / 12);
  const remainingMonths = ageInMonths % 12;
  const yearsLabel = years === 1 ? 'година' : 'години';

  if (remainingMonths === 0) {
    return String(years) + ' ' + yearsLabel;
  }

  return String(years) + ' ' + yearsLabel + ' и ' + String(remainingMonths) + ' ' + (remainingMonths === 1 ? 'месец' : 'месеца');
}

function getPrimaryImageUrl(animal) {
  if (Array.isArray(animal.imageUrls) && animal.imageUrls.length > 0) {
    return animal.imageUrls[0];
  }

  if (animal.imageUrl) {
    return animal.imageUrl;
  }

  return '';
}

function getDisplayName(animal) {
  return normalizeDisplayText(
    animal.displayName ??
      animal.name
  );
}

function canUseStandardAdoptionFlow(species, status) {
  return status === 'available' && !PROTECTED_CARE_SPECIES.has(species);
}

function serializeAnimal(animal) {
  const species = normalizeSpecies(animal.species);
  const size = normalizeSize(animal.size);
  const gender = normalizeGender(animal.gender);
  const age = Number(animal.age ?? 0);
  const ageText = formatAnimalAge(age);
  const displayName = getDisplayName(animal);
  const description = animal.description ?? '';
  const primaryImageCandidate = normalizeStoredAssetPath(getPrimaryImageUrl(animal));
  const primaryImageUrl = canExposeStoredImageUrl(primaryImageCandidate) ? primaryImageCandidate : '';
  const storedImageUrls = Array.isArray(animal.imageUrls)
    ? animal.imageUrls
        .map((imageUrl) => normalizeStoredAssetPath(imageUrl))
        .filter((imageUrl) => imageUrl && canExposeStoredImageUrl(imageUrl))
    : [];
  const imageUrls = storedImageUrls.length > 0 ? storedImageUrls : primaryImageUrl ? [primaryImageUrl] : [];

  return {
    id: animal.slug ?? String(animal._id),
    slug: animal.slug ?? String(animal._id),
    name: animal.name,
    displayName: displayName || animal.name,
    species,
    speciesLabel: ANIMAL_SPECIES_LABELS[species] ?? species,
    breed: animal.breed,
    age,
    ageText,
    gender,
    genderLabel: ANIMAL_GENDER_LABELS[gender] ?? gender,
    size,
    sizeLabel: ANIMAL_SIZE_LABELS[size] ?? size,
    status: animal.status,
    statusLabel: ANIMAL_STATUS_LABELS[animal.status] ?? animal.status,
    standardAdoptionEligible: canUseStandardAdoptionFlow(species, animal.status),
    isActive: Boolean(animal.isActive),
    intakeDate: normalizeDateOutput(animal.intakeDate),
    healthStatus: animal.healthStatus,
    vaccinated: Boolean(animal.vaccinated),
    neutered: Boolean(animal.neutered),
    description,
    story: animal.story ?? '',
    historyAndCharacter: animal.historyAndCharacter ?? '',
    details: animal.details ?? '',
    careConditions: animal.careConditions ?? '',
    imageUrls,
    imageUrl: primaryImageUrl,
    createdAt: normalizeDateOutput(animal.createdAt),
    updatedAt: normalizeDateOutput(animal.updatedAt),
    facts: animal.facts ?? `${ANIMAL_SPECIES_LABELS[species] ?? species} | ${ageText} | ${ANIMAL_GENDER_LABELS[gender] ?? gender}`,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseBooleanField(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalizedValue = normalizeText(value);

  if (['true', '1', 'yes', 'да'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', 'не'].includes(normalizedValue)) {
    return false;
  }

  throw createHttpError(400, 'Полето "' + fieldName + '" трябва да бъде true или false.');
}

function parseNumberField(value, fieldName) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw createHttpError(400, 'Полето "' + fieldName + '" трябва да бъде неотрицателно число.');
  }

  return numericValue;
}

function parseDateField(value, fieldName) {
  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    throw createHttpError(400, 'Полето "' + fieldName + '" трябва да бъде валидна дата.');
  }

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (dateValue > todayEnd) {
    throw createHttpError(400, 'Полето "' + fieldName + '" не може да бъде бъдеща дата.');
  }

  return dateValue.toISOString();
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

function assertValidImageUrl(imageUrl, imageIndex) {
  const fieldLabel = `imageUrls[${imageIndex}]`;
  const dataImage = parseDataImageUrl(imageUrl);

  if (/^data:/i.test(imageUrl)) {
    if (!dataImage || !ANIMAL_IMAGE_DATA_MIME_TYPES.includes(dataImage.mimeType)) {
      throw createHttpError(
        400,
        `Полето "${fieldLabel}" трябва да бъде JPEG, PNG или WebP image data URL.`
      );
    }

    if (dataImage.byteLength > ANIMAL_IMAGE_MAX_BYTES) {
      throw createHttpError(
        400,
        `Всяка снимка трябва да бъде до ${Math.floor(ANIMAL_IMAGE_MAX_BYTES / 1024 / 1024)} MB.`
      );
    }

    return dataImage.byteLength;
  }

  if (!isAllowedStoredImagePath(imageUrl)) {
    throw createHttpError(
      400,
      `Полето "${fieldLabel}" трябва да бъде HTTPS адрес, локален images път или image data URL.`
    );
  }

  if (imageUrl.length > ANIMAL_IMAGE_URL_MAX_LENGTH) {
    throw createHttpError(
      400,
      `Адресът в "${fieldLabel}" може да бъде най-много ${ANIMAL_IMAGE_URL_MAX_LENGTH} символа.`
    );
  }

  return 0;
}

function canExposeStoredImageUrl(imageUrl) {
  const dataImage = parseDataImageUrl(imageUrl);

  if (dataImage) {
    return (
      ANIMAL_IMAGE_DATA_MIME_TYPES.includes(dataImage.mimeType) &&
      dataImage.byteLength <= ANIMAL_IMAGE_MAX_BYTES
    );
  }

  return isAllowedStoredImagePath(imageUrl) && imageUrl.length <= ANIMAL_IMAGE_URL_MAX_LENGTH;
}

function validateImageUrls(imageUrls) {
  if (imageUrls.length > ANIMAL_IMAGE_MAX_COUNT) {
    throw createHttpError(400, `Можеш да добавиш най-много ${ANIMAL_IMAGE_MAX_COUNT} снимки.`);
  }

  const totalEmbeddedImageBytes = imageUrls.reduce(
    (totalBytes, imageUrl, index) => totalBytes + assertValidImageUrl(imageUrl, index),
    0
  );

  if (totalEmbeddedImageBytes > ANIMAL_IMAGE_MAX_TOTAL_BYTES) {
    throw createHttpError(
      400,
      `Общият размер на качените снимки трябва да бъде до ${Math.floor(ANIMAL_IMAGE_MAX_TOTAL_BYTES / 1024 / 1024)} MB.`
    );
  }
}

function normalizeImageUrls(payload, options = {}) {
  if (payload.imageUrls !== undefined) {
    if (!Array.isArray(payload.imageUrls)) {
      throw createHttpError(400, 'Полето "imageUrls" трябва да бъде масив от адреси.');
    }

    const imageUrls = payload.imageUrls
      .map((entry) => normalizeStoredAssetPath(entry))
      .filter(Boolean);

    validateImageUrls(imageUrls);
    return imageUrls;
  }

  return options.defaultValue;
}

function assertValidAnimalId(animalId) {
  const normalizedAnimalId = normalizeLookupAnimalId(animalId);

  if (!normalizedAnimalId) {
    throw createHttpError(400, 'Липсва идентификатор на животното.');
  }

  if (
    !ANIMAL_ID_SLUG_PATTERN.test(normalizedAnimalId) &&
    !mongoose.isValidObjectId(normalizedAnimalId)
  ) {
    throw createHttpError(400, 'Идентификаторът на животното е в невалиден формат.');
  }

  return normalizedAnimalId;
}

function buildLookupQuery(animalId) {
  const normalizedAnimalId = assertValidAnimalId(animalId);
  const lookupQuery = [{ slug: normalizedAnimalId }];

  if (mongoose.isValidObjectId(normalizedAnimalId)) {
    lookupQuery.push({ _id: normalizedAnimalId });
  }

  return { $or: lookupQuery };
}

async function findAnimalRecordById(animalId, options = {}) {
  const normalizedAnimalId = assertValidAnimalId(animalId);
  const query = Animal.findOne(buildLookupQuery(normalizedAnimalId));

  if (options.session) {
    query.session(options.session);
  }

  return query.lean();
}

async function ensureUniqueSlug(slug) {
  const query = { slug };
  const existingAnimal = await Animal.findOne(query).lean();

  if (existingAnimal) {
    throw createHttpError(409, 'Вече съществува животно със същия slug.');
  }
}

function throwDuplicateAnimalError(error) {
  const duplicateError = createDuplicateKeyHttpError(error, {
    fieldMessages: {
      slug: 'Вече съществува животно със същия slug.',
    },
    fallbackMessage: 'Животно с тези данни вече съществува.',
  });

  if (duplicateError) {
    throw duplicateError;
  }

  throw error;
}

function isManagementAnimalRole(currentUser) {
  return hasPermission(currentUser?.role, 'animals', 'view-all');
}

function canExposeAnimalRecord(animal, currentUser = null, options = {}) {
  if (!animal) {
    return false;
  }

  if (
    options.restrictToPublicAnimal &&
    !isManagementAnimalRole(currentUser) &&
    (
      options.publicVisibility === 'detail'
        ? animal.isActive !== true || INACTIVE_ANIMAL_STATUSES.has(animal.status)
        : animal.status !== 'available' || animal.isActive !== true
    )
  ) {
    return false;
  }

  return true;
}

function serializeAnimalReference(animal) {
  return {
    databaseId: String(animal._id),
    item: serializeAnimal(animal),
  };
}

function assertCanWriteAnimalLifecycleStatus(currentUser, currentStatus, nextStatus) {
  const touchesRestrictedLifecycleStatus = [currentStatus, nextStatus].some((status) =>
    DEACTIVATE_PERMISSION_STATUSES.has(status)
  );

  if (
    !touchesRestrictedLifecycleStatus ||
    hasPermission(currentUser?.role, 'animals', 'deactivate')
  ) {
    return;
  }

  throw createHttpError(
    403,
    'Нямаш право да деактивираш, архивираш или реактивираш животни.'
  );
}

function assertCanEditAnimalRecord(currentUser, currentStatus) {
  if (
    !DEACTIVATE_PERMISSION_STATUSES.has(currentStatus) ||
    hasPermission(currentUser?.role, 'animals', 'deactivate')
  ) {
    return;
  }

  throw createHttpError(
    403,
    'Нямаш право да редактираш деактивирано или архивирано животно.'
  );
}

function assertCreatableAnimalStatus(status) {
  if (ANIMAL_CREATABLE_STATUS_VALUES.includes(status)) {
    return;
  }

  throw createHttpError(400, 'Нов запис на животно не може да започне с този статус.', {
    allowedStatuses: ANIMAL_CREATABLE_STATUS_VALUES,
  });
}

function assertManualAnimalStatusTransition(currentStatus, nextStatus, { allowSystemManagedStatuses = false } = {}) {
  if (allowSystemManagedStatuses) {
    return;
  }

  const manuallyArchivesAdoptedAnimal = currentStatus === 'adopted' && nextStatus === 'archived';

  if (!SYSTEM_MANAGED_ANIMAL_STATUSES.has(currentStatus) && !SYSTEM_MANAGED_ANIMAL_STATUSES.has(nextStatus)) {
    return;
  }

  if (manuallyArchivesAdoptedAnimal) {
    return;
  }

  throw createHttpError(
    409,
    'Статусите "reserved" и "adopted" се управляват през процеса на осиновяване.',
    {
      systemManagedStatuses: ANIMAL_SYSTEM_MANAGED_STATUS_VALUES,
      manualStatuses: ANIMAL_MANUAL_STATUS_VALUES,
    }
  );
}

function getIsActiveForStatus(status) {
  return !INACTIVE_ANIMAL_STATUSES.has(status);
}

function synchronizeStatusAndActivity(status, currentAnimal = null) {
  const nextStatus = status ?? currentAnimal?.status ?? 'available';

  return {
    status: nextStatus,
    isActive: getIsActiveForStatus(nextStatus),
  };
}

function assertAllowedStatusTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus || currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = ANIMAL_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (!allowedTransitions.includes(nextStatus)) {
    throw createHttpError(
      409,
      'Преходът от статус "' + currentStatus + '" към "' + nextStatus + '" не е разрешен.',
      {
        currentStatus,
        requestedStatus: nextStatus,
        allowedTransitions,
      }
    );
  }
}

function normalizeAnimalWritePayload(payload, options = {}) {
  // In partial mode, only explicitly provided fields are normalized
  // so omitted values are preserved during PATCH updates.
  const partial = Boolean(options.partial);
  const currentAnimal = options.currentAnimal ?? null;
  const currentUser = options.currentUser ?? null;
  const normalizedPayload = {};
  let hasExplicitChanges = false;

  if (!partial || payload.slug !== undefined) {
    const rawSlugSource = payload.slug ?? payload.name ?? currentAnimal?.slug;
    const slug = slugify(rawSlugSource);

    if (!slug) {
      throw createHttpError(400, 'Не може да бъде генериран валиден slug за животното.');
    }

    if (slug.length > ANIMAL_TEXT_LIMITS.slug) {
      throw createHttpError(400, `Полето "slug" може да бъде най-много ${ANIMAL_TEXT_LIMITS.slug} символа.`);
    }

    normalizedPayload.slug = slug;
    hasExplicitChanges = true;
  }

  if (!partial || payload.name !== undefined) {
    const name = normalizeLimitedDisplayText(payload.name, 'name', ANIMAL_TEXT_LIMITS.name, {
      required: true,
    });

    normalizedPayload.name = name;
    hasExplicitChanges = true;
  }

  if (payload.displayName !== undefined) {
    normalizedPayload.displayName = normalizeLimitedDisplayText(
      payload.displayName,
      'displayName',
      ANIMAL_TEXT_LIMITS.displayName
    );
    hasExplicitChanges = true;
  }

  if (!partial || payload.species !== undefined) {
    const species = normalizeSpecies(payload.species);

    if (!species || !ANIMAL_SPECIES_VALUES.includes(species)) {
      throw createHttpError(400, 'Полето "species" съдържа невалидна стойност.');
    }

    normalizedPayload.species = species;
    hasExplicitChanges = true;
  }

  if (!partial || payload.breed !== undefined) {
    const breed = normalizeLimitedDisplayText(payload.breed, 'breed', ANIMAL_TEXT_LIMITS.breed, {
      required: true,
    });

    normalizedPayload.breed = breed;
    hasExplicitChanges = true;
  }

  if (!partial || payload.age !== undefined) {
    normalizedPayload.age = parseNumberField(payload.age, 'age');
    hasExplicitChanges = true;
  }

  if (!partial || payload.gender !== undefined) {
    const gender = normalizeGender(payload.gender);

    if (!ANIMAL_GENDER_VALUES.includes(gender)) {
      throw createHttpError(400, 'Полето "gender" съдържа невалидна стойност.');
    }

    normalizedPayload.gender = gender;
    hasExplicitChanges = true;
  }

  if (!partial || payload.size !== undefined) {
    const size = normalizeSize(payload.size);

    if (!ANIMAL_SIZE_VALUES.includes(size)) {
      throw createHttpError(400, 'Полето "size" съдържа невалидна стойност.');
    }

    normalizedPayload.size = size;
    hasExplicitChanges = true;
  }

  if (!partial || payload.status !== undefined) {
    const status = normalizeText(payload.status);

    if (!ANIMAL_STATUS_VALUES.includes(status)) {
      throw createHttpError(400, 'Полето "status" съдържа невалидна стойност.');
    }

    if (!partial) {
      assertCreatableAnimalStatus(status);
    }

    assertCanWriteAnimalLifecycleStatus(currentUser, currentAnimal?.status, status);
    normalizedPayload.status = status;
    hasExplicitChanges = true;
  }

  if (!partial || payload.intakeDate !== undefined) {
    normalizedPayload.intakeDate = parseDateField(payload.intakeDate, 'intakeDate');
    hasExplicitChanges = true;
  }

  if (!partial || payload.healthStatus !== undefined) {
    const healthStatus = normalizeLimitedDisplayText(
      payload.healthStatus,
      'healthStatus',
      ANIMAL_TEXT_LIMITS.healthStatus,
      {
        required: true,
      }
    );

    normalizedPayload.healthStatus = healthStatus;
    hasExplicitChanges = true;
  }

  if (!partial || payload.vaccinated !== undefined) {
    normalizedPayload.vaccinated =
      payload.vaccinated !== undefined
        ? parseBooleanField(payload.vaccinated, 'vaccinated')
        : false;
    hasExplicitChanges = true;
  }

  if (!partial || payload.neutered !== undefined) {
    normalizedPayload.neutered =
      payload.neutered !== undefined ? parseBooleanField(payload.neutered, 'neutered') : false;
    hasExplicitChanges = true;
  }

  if (!partial || payload.description !== undefined) {
    const description = normalizeLimitedDisplayText(
      payload.description,
      'description',
      ANIMAL_TEXT_LIMITS.description,
      {
        required: true,
      }
    );

    normalizedPayload.description = description;
    hasExplicitChanges = true;
  }

  if (payload.story !== undefined) {
    normalizedPayload.story = normalizeLimitedDisplayText(payload.story, 'story', ANIMAL_TEXT_LIMITS.story);
    hasExplicitChanges = true;
  }

  if (payload.historyAndCharacter !== undefined) {
    normalizedPayload.historyAndCharacter = normalizeLimitedDisplayText(
      payload.historyAndCharacter,
      'historyAndCharacter',
      ANIMAL_TEXT_LIMITS.historyAndCharacter
    );
    hasExplicitChanges = true;
  }

  if (payload.details !== undefined) {
    normalizedPayload.details = normalizeLimitedDisplayText(payload.details, 'details', ANIMAL_TEXT_LIMITS.details);
    hasExplicitChanges = true;
  }

  if (payload.careConditions !== undefined) {
    normalizedPayload.careConditions = normalizeLimitedDisplayText(
      payload.careConditions,
      'careConditions',
      ANIMAL_TEXT_LIMITS.careConditions
    );
    hasExplicitChanges = true;
  }

  const imageUrls = normalizeImageUrls(payload, {
    defaultValue: partial ? undefined : [],
  });

  if (imageUrls !== undefined) {
    normalizedPayload.imageUrls = imageUrls;
    hasExplicitChanges = true;
  }

  if (partial && !hasExplicitChanges) {
    throw createHttpError(400, 'Няма подадени данни за редакция.');
  }

  if (normalizedPayload.status !== undefined) {
    const statusAndActivity = synchronizeStatusAndActivity(normalizedPayload.status, currentAnimal);

    assertAllowedStatusTransition(currentAnimal?.status, statusAndActivity.status);

    normalizedPayload.status = statusAndActivity.status;
    normalizedPayload.isActive = statusAndActivity.isActive;
  }

  return normalizedPayload;
}

function normalizeStatusUpdatePayload(payload, currentAnimal, currentUser = null, options = {}) {
  const status = normalizeText(payload.status);

  if (!ANIMAL_STATUS_VALUES.includes(status)) {
    throw createHttpError(400, 'Полето "status" съдържа невалидна стойност.');
  }

  assertCanWriteAnimalLifecycleStatus(currentUser, currentAnimal?.status, status);
  assertManualAnimalStatusTransition(currentAnimal?.status, status, options);

  const nextStatusAndActivity = synchronizeStatusAndActivity(status, currentAnimal);
  assertAllowedStatusTransition(currentAnimal?.status, nextStatusAndActivity.status);
  return nextStatusAndActivity;
}

function normalizeDeactivatePayload(payload, currentAnimal, options = {}) {
  const requestedStatus = normalizeText(payload.status ?? 'inactive');

  if (!['inactive', 'archived'].includes(requestedStatus)) {
    throw createHttpError(
      400,
      'Deactivate операцията позволява само статус "inactive" или "archived".'
    );
  }

  const nextStatusAndActivity = synchronizeStatusAndActivity(requestedStatus, currentAnimal);

  assertManualAnimalStatusTransition(currentAnimal?.status, nextStatusAndActivity.status, options);
  assertAllowedStatusTransition(currentAnimal?.status, nextStatusAndActivity.status);
  return nextStatusAndActivity;
}

function normalizeSortValue(value) {
  const rawSort = String(value || 'name-asc').trim();
  const normalizedSort = ANIMAL_SORT_VALUE_BY_NORMALIZED_VALUE[rawSort.toLowerCase()] ?? rawSort;

  if (!ANIMAL_SORT_VALUES.includes(normalizedSort)) {
    throw createHttpError(400, 'Параметърът "sort" съдържа невалидна стойност.');
  }

  return normalizedSort;
}

function resolveSortDefinition(sortValue) {
  const [field, directionCandidate] = sortValue.split('-');
  const direction = directionCandidate === 'desc' ? -1 : 1;

  return {
    field,
    direction,
    value: sortValue,
    mongo: { [field]: direction, _id: direction },
  };
}

function normalizeAnimalListOptions(filters = {}) {
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: 12,
    maxLimit: 48,
  });
  const sort = normalizeSortValue(filters.sort);
  const sortDefinition = resolveSortDefinition(sort);

  return {
    ...paginationOptions,
    sort,
    sortDefinition,
  };
}

function buildMongoFilters(filters, options = {}) {
  const searchTerms = getSearchTerms(filters.query);
  const species = normalizeSpecies(filters.species);
  const gender = normalizeGender(filters.gender);
  const size = normalizeSize(filters.size);
  const status = normalizeText(filters.status);
  const restrictToPublicAnimals = Boolean(options.restrictToPublicAnimals);
  const mongoFilters = {};

  if (searchTerms.length > 0) {
    mongoFilters.$or = buildMongoSearchConditions(searchTerms);
  }

  if (species) {
    mongoFilters.species = species;
  }

  if (gender) {
    mongoFilters.gender = gender;
  }

  if (size) {
    mongoFilters.size = size;
  }

  if (restrictToPublicAnimals) {
    mongoFilters.status = PUBLIC_ANIMAL_LIST_STATUSES.has(status)
      ? status
      : { $in: [...PUBLIC_ANIMAL_LIST_STATUS_VALUES] };
    mongoFilters.isActive = true;
  } else if (status) {
    mongoFilters.status = status;
  }

  return mongoFilters;
}

export async function getAnimalsCollection(filters = {}, currentUser = null) {
  const listOptions = normalizeAnimalListOptions(filters);
  const mongoFilters = buildMongoFilters(filters, {
    restrictToPublicAnimals: !isManagementAnimalRole(currentUser),
  });
  const total = await Animal.countDocuments(mongoFilters);
  const pagination = buildPagination(total, listOptions);
  const query = applyPagination(
    Animal.find(mongoFilters).sort(listOptions.sortDefinition.mongo),
    pagination
  );
  const animals = await query.lean();
  const items = animals.map(serializeAnimal);

  return {
    items,
    total,
    pagination,
    sort: listOptions.sort,
  };
}

export async function getAnimalById(animalId, currentUser = null, options = {}) {
  const animal = await findAnimalRecordById(animalId, {
    session: options.session,
  });

  if (!canExposeAnimalRecord(animal, currentUser, options)) {
    return null;
  }

  return animal ? serializeAnimal(animal) : null;
}

export async function getAnimalReferenceById(animalId, currentUser = null, options = {}) {
  const animal = await findAnimalRecordById(animalId);

  if (!canExposeAnimalRecord(animal, currentUser, options)) {
    return null;
  }

  return serializeAnimalReference(animal);
}

export async function getAnimalReferencesByIds(animalIds = [], currentUser = null, options = {}) {
  const normalizedAnimalIds = [
    ...new Set(
      animalIds
        .map((animalId) => String(animalId ?? '').trim())
        .filter((animalId) => mongoose.isValidObjectId(animalId))
    ),
  ];

  if (normalizedAnimalIds.length === 0) {
    return [];
  }

  const mongoFilters = {
    _id: { $in: normalizedAnimalIds },
  };

  if (options.restrictToPublicAnimal && !isManagementAnimalRole(currentUser)) {
    mongoFilters.isActive = true;

    if (options.publicVisibility === 'detail') {
      mongoFilters.status = { $nin: [...INACTIVE_ANIMAL_STATUSES] };
    } else {
      mongoFilters.status = 'available';
    }
  }

  const animals = await Animal.find(mongoFilters).lean();
  return animals.map(serializeAnimalReference);
}

export async function createAnimal(payload, currentUser = null) {
  assertBodyObject(payload);
  assertAllowedFields(payload, CREATE_ANIMAL_ALLOWED_FIELDS);

  const normalizedPayload = normalizeAnimalWritePayload(payload, {
    currentUser,
  });
  await ensureUniqueSlug(normalizedPayload.slug);
  let createdAnimal = null;

  try {
    createdAnimal = await Animal.create(normalizedPayload);
  } catch (error) {
    throwDuplicateAnimalError(error);
  }

  return serializeAnimal(createdAnimal.toObject());
}

export async function updateAnimal(animalId, payload, currentUser = null) {
  assertBodyObject(payload, { allowEmpty: true });
  assertAllowedFields(payload, UPDATE_ANIMAL_ALLOWED_FIELDS);

  const currentAnimal = await findAnimalRecordById(animalId);

  if (!currentAnimal) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  assertCanEditAnimalRecord(currentUser, currentAnimal.status);

  const normalizedPayload = normalizeAnimalWritePayload(payload, {
    partial: true,
    currentAnimal,
    currentUser,
  });

  let updatedAnimal = null;

  try {
    updatedAnimal = await Animal.findOneAndUpdate(buildLookupQuery(animalId), normalizedPayload, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
  } catch (error) {
    throwDuplicateAnimalError(error);
  }

  if (!updatedAnimal) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  return serializeAnimal(updatedAnimal);
}

export async function updateAnimalStatus(animalId, payload, currentUser = null, options = {}) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ANIMAL_STATUS_UPDATE_ALLOWED_FIELDS);

  const currentAnimal = await findAnimalRecordById(animalId, {
    session: options.session,
  });

  if (!currentAnimal) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  const normalizedPayload = normalizeStatusUpdatePayload(payload, currentAnimal, currentUser, options);

  // The previous status is part of the filter so only one concurrent lifecycle transition can succeed.
  const updatedAnimal = await Animal.findOneAndUpdate(
    {
      ...buildLookupQuery(animalId),
      status: currentAnimal.status,
    },
    normalizedPayload,
    {
      returnDocument: 'after',
      runValidators: true,
      session: options.session,
    }
  ).lean();

  if (!updatedAnimal) {
    throw createHttpError(409, 'Статусът е променен от друга операция. Обнови данните.');
  }

  if (updatedAnimal.status === 'adopted') {
    // Adoption makes the animal irrelevant to every user's favorites; reuse the session for atomic cleanup.
    const deleteFavoritesQuery = Favorite.deleteMany({ animalId: updatedAnimal._id });

    if (options.session) {
      deleteFavoritesQuery.session(options.session);
    }

    await deleteFavoritesQuery;
  }

  return serializeAnimal(updatedAnimal);
}

export async function deactivateAnimal(animalId, payload = {}) {
  assertBodyObject(payload, { allowEmpty: true });
  assertAllowedFields(payload, ANIMAL_DEACTIVATE_ALLOWED_FIELDS);

  const currentAnimal = await findAnimalRecordById(animalId);

  if (!currentAnimal) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  const normalizedPayload = normalizeDeactivatePayload(payload, currentAnimal);

  const updatedAnimal = await Animal.findOneAndUpdate(
    {
      ...buildLookupQuery(animalId),
      status: currentAnimal.status,
    },
    normalizedPayload,
    {
      returnDocument: 'after',
      runValidators: true,
    }
  ).lean();

  if (!updatedAnimal) {
    throw createHttpError(409, 'Статусът е променен от друга операция. Обнови данните.');
  }

  return serializeAnimal(updatedAnimal);
}

