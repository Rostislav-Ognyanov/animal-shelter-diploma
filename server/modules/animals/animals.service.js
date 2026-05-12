import mongoose from 'mongoose';

import { isAnimalsMockFallbackEnabled, isDatabaseConnected } from '../../config/db.js';
import Animal from '../../models/Animal.js';
import { createHttpError } from '../../utils/httpError.js';
import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { saveJsonFile } from '../../utils/saveJsonFile.js';
import {
  ANIMAL_GENDER_LABELS,
  ANIMAL_GENDER_VALUES,
  ANIMAL_ID_SLUG_PATTERN,
  ANIMAL_SIZE_LABELS,
  ANIMAL_SIZE_VALUES,
  ANIMAL_SPECIES_LABELS,
  ANIMAL_SPECIES_VALUES,
  ANIMAL_SORT_VALUES,
  ANIMAL_STATUS_TRANSITIONS,
  ANIMAL_STATUS_LABELS,
  ANIMAL_STATUS_VALUES,
} from './animal.constants.js';
import { getAllowedAnimalActions } from '../shared/rolePolicies.js';

const ANIMALS_DATA_PATH = 'data/animals.json';
const INACTIVE_ANIMAL_STATUSES = new Set(['inactive', 'archived']);
const ANIMAL_SORT_VALUE_BY_NORMALIZED_VALUE = ANIMAL_SORT_VALUES.reduce((sortMap, sortValue) => {
  sortMap[sortValue.toLowerCase()] = sortValue;
  return sortMap;
}, {});
const ANIMAL_DISPLAY_NAMES_BY_SLUG = {
  'hotdog-dachshund-dog': '\u0425\u043e\u0442\u0434\u043e\u0433',
  'lily-beagle-dog': '\u041b\u0438\u043b\u0438',
  'kiara-american-pitbull-dog': '\u041a\u0438\u0430\u0440\u0430',
  'max-golden-retriever-dog': '\u041c\u0430\u043a\u0441',
  'danny-irish-wolfhound-dog': '\u0414\u0430\u043d\u0438',
  'mona-munchkin-cat': '\u041c\u043e\u043d\u0430',
  'tom-domestic-shorthair-tuxedo-cat': '\u0422\u043e\u043c',
  'garfield-domestic-shorthair-ginger-cat': '\u0413\u0430\u0440\u0444\u0438\u0439\u043b\u0434',
  'diona-domestic-longhair-cat': '\u0414\u0438\u043e\u043d\u0430',
  'harrison-maine-coon-cat': '\u0425\u0430\u0440\u0438\u0441\u044a\u043d',
  'minny-holland-lop-rabbit': '\u041c\u0438\u043d\u0438',
  'billy-english-spot-rabbit': '\u0411\u0438\u043b\u0438',
  'daisy-english-angora-rabbit': '\u0414\u0435\u0439\u0437\u0438',
  'shiro-new-zealand-white-rabbit': '\u0428\u0438\u0440\u043e',
  'ruby-flemish-giant-rabbit': '\u0420\u0443\u0431\u0438',
  'tina-wild-fox': '\u0422\u0438\u043d\u0430',
  'charles-wild-fox': '\u0427\u0430\u0440\u043b\u0441',
  'sidney-wild-fox': '\u0421\u0438\u0434\u043d\u0438',
  'ethan-wild-fox': '\u0418\u0442\u044a\u043d',
  'dayana-crested-gecko-lizard': '\u0414\u0430\u044f\u043d\u0430',
  'sirocco-leopard-gecko-lizard': '\u0421\u0438\u0440\u043e\u043a\u043e',
  'vivy-panther-chameleon-lizard': '\u0412\u0438\u0432\u0438',
  'martin-green-iguana-lizard': '\u041c\u0430\u0440\u0442\u0438\u043d',
  'billy-northern-hawk-owl': '\u0411\u0438\u043b\u0438',
  'gabrielle-burrowing-owl': '\u0413\u0430\u0431\u0440\u0438\u0435\u043b',
  'sydney-barn-owl': '\u0421\u0438\u0434\u043d\u0438',
  'shiro-snowy-owl': '\u0428\u0438\u0440\u043e',
  'dolly-shetland-pony-horse': '\u0414\u043e\u043b\u0438',
  'oden-thoroughbred-domestic-horse': '\u041e\u0434\u0435\u043d',
  'zanny-paso-fino-horse': '\u0417\u0430\u043d\u0438',
  'ryan-friesian-horse': '\u0420\u0430\u0439\u044a\u043d',
  'angel-clydesdale-horse': '\u0415\u0439\u043d\u0434\u0436\u044a\u043b',
  'tommy-wild-hedgehog': '\u0422\u043e\u043c\u0438',
  'ronald-wild-hedgehog': '\u0420\u043e\u043d\u0430\u043b\u0434',
  'ashley-wild-hedgehog': '\u0410\u0448\u043b\u0438',
  'gina-wild-hedgehog': '\u0414\u0436\u0438\u043d\u0430',
};
const ANIMAL_DISPLAY_NAMES_BY_NAME = {
  Hotdog: '\u0425\u043e\u0442\u0434\u043e\u0433',
  Lily: '\u041b\u0438\u043b\u0438',
  Kiara: '\u041a\u0438\u0430\u0440\u0430',
  Max: '\u041c\u0430\u043a\u0441',
  Danny: '\u0414\u0430\u043d\u0438',
  Mona: '\u041c\u043e\u043d\u0430',
  Tom: '\u0422\u043e\u043c',
  Garfield: '\u0413\u0430\u0440\u0444\u0438\u0439\u043b\u0434',
  Diona: '\u0414\u0438\u043e\u043d\u0430',
  Harrison: '\u0425\u0430\u0440\u0438\u0441\u044a\u043d',
  Minny: '\u041c\u0438\u043d\u0438',
  Billy: '\u0411\u0438\u043b\u0438',
  Daisy: '\u0414\u0435\u0439\u0437\u0438',
  Shiro: '\u0428\u0438\u0440\u043e',
  Ruby: '\u0420\u0443\u0431\u0438',
  Tina: '\u0422\u0438\u043d\u0430',
  Charles: '\u0427\u0430\u0440\u043b\u0441',
  Sidney: '\u0421\u0438\u0434\u043d\u0438',
  Ethan: '\u0418\u0442\u044a\u043d',
  Dayana: '\u0414\u0430\u044f\u043d\u0430',
  Sirocco: '\u0421\u0438\u0440\u043e\u043a\u043e',
  Vivy: '\u0412\u0438\u0432\u0438',
  Martin: '\u041c\u0430\u0440\u0442\u0438\u043d',
  Gabrielle: '\u0413\u0430\u0431\u0440\u0438\u0435\u043b',
  Sydney: '\u0421\u0438\u0434\u043d\u0438',
  Dolly: '\u0414\u043e\u043b\u0438',
  Oden: '\u041e\u0434\u0435\u043d',
  Zanny: '\u0417\u0430\u043d\u0438',
  Ryan: '\u0420\u0430\u0439\u044a\u043d',
  Angel: '\u0415\u0439\u043d\u0434\u0436\u044a\u043b',
  Tommy: '\u0422\u043e\u043c\u0438',
  Ronald: '\u0420\u043e\u043d\u0430\u043b\u0434',
  Ashley: '\u0410\u0448\u043b\u0438',
  Gina: '\u0414\u0436\u0438\u043d\u0430',
};
const SPECIES_ALIASES = {
  dog: 'dog',
  dogs: 'dog',
  '\u043a\u0443\u0447\u0435': 'dog',
  '\u043a\u0443\u0447\u0435\u0442\u0430': 'dog',
  cat: 'cat',
  cats: 'cat',
  '\u043a\u043e\u0442\u043a\u0430': 'cat',
  '\u043a\u043e\u0442\u043a\u0438': 'cat',
  rabbit: 'rabbit',
  rabbits: 'rabbit',
  '\u0437\u0430\u0435\u043a': 'rabbit',
  '\u0437\u0430\u0439\u0447\u0435': 'rabbit',
  '\u0437\u0430\u0439\u0446\u0438': 'rabbit',
  fox: 'fox',
  foxes: 'fox',
  '\u043b\u0438\u0441\u0438\u0446\u0430': 'fox',
  '\u043b\u0438\u0441\u0438\u0446\u0438': 'fox',
  lizard: 'lizard',
  lizards: 'lizard',
  '\u0433\u0443\u0449\u0435\u0440': 'lizard',
  '\u0433\u0443\u0449\u0435\u0440\u0438': 'lizard',
  owl: 'owl',
  owls: 'owl',
  '\u0441\u043e\u0432\u0430': 'owl',
  '\u0441\u043e\u0432\u0438': 'owl',
  horse: 'horse',
  horses: 'horse',
  '\u043a\u043e\u043d': 'horse',
  '\u043a\u043e\u043d\u0435': 'horse',
  hedgehog: 'hedgehog',
  hedgehogs: 'hedgehog',
  '\u0442\u0430\u0440\u0430\u043b\u0435\u0436': 'hedgehog',
  '\u0442\u0430\u0440\u0430\u043b\u0435\u0436\u0438': 'hedgehog',
};
const SIZE_ALIASES = {
  small: 'small',
  s: 'small',
  's size': 'small',
  '\u043c\u0430\u043b\u043a\u0430': 'small',
  medium: 'medium',
  m: 'medium',
  'm size': 'medium',
  '\u0441\u0440\u0435\u0434\u043d\u0430': 'medium',
  large: 'large',
  l: 'large',
  'l size': 'large',
  '\u0433\u043e\u043b\u044f\u043c\u0430': 'large',
  'extra-large': 'extra-large',
  'extra large': 'extra-large',
  xl: 'extra-large',
  'xl size': 'extra-large',
  '\u043c\u043d\u043e\u0433\u043e \u0433\u043e\u043b\u044f\u043c\u0430': 'extra-large',
};
const GENDER_ALIASES = {
  male: 'male',
  m: 'male',
  '\u043c\u044a\u0436\u043a\u0438': 'male',
  female: 'female',
  f: 'female',
  '\u0436\u0435\u043d\u0441\u043a\u0438': 'female',
  unknown: 'unknown',
  '\u043d\u0435\u0443\u0442\u043e\u0447\u043d\u0435\u043d': 'unknown',
};
const CYRILLIC_TO_LATIN_MAP = {
  '\u0430': 'a',
  '\u0431': 'b',
  '\u0432': 'v',
  '\u0433': 'g',
  '\u0434': 'd',
  '\u0435': 'e',
  '\u0436': 'zh',
  '\u0437': 'z',
  '\u0438': 'i',
  '\u0439': 'y',
  '\u043a': 'k',
  '\u043b': 'l',
  '\u043c': 'm',
  '\u043d': 'n',
  '\u043e': 'o',
  '\u043f': 'p',
  '\u0440': 'r',
  '\u0441': 's',
  '\u0442': 't',
  '\u0443': 'u',
  '\u0444': 'f',
  '\u0445': 'h',
  '\u0446': 'ts',
  '\u0447': 'ch',
  '\u0448': 'sh',
  '\u0449': 'sht',
  '\u044a': 'a',
  '\u044c': 'y',
  '\u044e': 'yu',
  '\u044f': 'ya',
};

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeDisplayText(value) {
  return String(value ?? '').trim();
}

function normalizeDateOutput(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
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

function formatAnimalAge(ageValue) {
  const numericAge = Number(ageValue ?? 0);

  if (!Number.isFinite(numericAge) || numericAge < 0) {
    return '\u041d\u0435\u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0430 \u0432\u044a\u0437\u0440\u0430\u0441\u0442';
  }

  const ageInMonths = Math.round(numericAge * 12);

  if (ageInMonths < 12) {
    return String(ageInMonths) + ' ' + (ageInMonths === 1 ? '\u043c\u0435\u0441\u0435\u0446' : '\u043c\u0435\u0441\u0435\u0446\u0430');
  }

  const years = Math.floor(ageInMonths / 12);
  const remainingMonths = ageInMonths % 12;
  const yearsLabel = years === 1 ? '\u0433\u043e\u0434\u0438\u043d\u0430' : '\u0433\u043e\u0434\u0438\u043d\u0438';

  if (remainingMonths === 0) {
    return String(years) + ' ' + yearsLabel;
  }

  return String(years) + ' ' + yearsLabel + ' \u0438 ' + String(remainingMonths) + ' ' + (remainingMonths === 1 ? '\u043c\u0435\u0441\u0435\u0446' : '\u043c\u0435\u0441\u0435\u0446\u0430');
}
function getPrimaryImageUrl(animal) {
  if (Array.isArray(animal.imageUrls) && animal.imageUrls.length > 0) {
    return animal.imageUrls[0];
  }

  if (animal.imageUrl) {
    return animal.imageUrl;
  }

  if (animal.image) {
    return animal.image;
  }

  return '/images/animals/dog.png';
}

function getDisplayName(animal) {
  const slug = normalizeDisplayText(animal.slug ?? animal.id ?? animal._id);
  const latinName = normalizeDisplayText(animal.name);

  return normalizeDisplayText(
    animal.displayName ??
      animal.localizedName ??
      ANIMAL_DISPLAY_NAMES_BY_SLUG[slug] ??
      ANIMAL_DISPLAY_NAMES_BY_NAME[latinName] ??
      animal.name
  );
}

function serializeAnimal(animal) {
  const species = normalizeSpecies(animal.species ?? animal.type);
  const size = normalizeSize(animal.size);
  const gender = normalizeGender(animal.gender);
  const age = Number(animal.age ?? animal.ageYears ?? 0);
  const ageText = formatAnimalAge(age);
  const displayName = getDisplayName(animal);
  const description = animal.description ?? animal.shortDescription ?? '';
  const primaryImageUrl = getPrimaryImageUrl(animal);
  const imageUrls =
    Array.isArray(animal.imageUrls) && animal.imageUrls.length > 0
      ? animal.imageUrls
      : [primaryImageUrl];

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
    isActive: Boolean(animal.isActive),
    intakeDate: normalizeDateOutput(animal.intakeDate),
    healthStatus: animal.healthStatus,
    vaccinated: Boolean(animal.vaccinated),
    neutered: Boolean(animal.neutered),
    description,
    imageUrls,
    imageUrl: primaryImageUrl,
    createdAt: normalizeDateOutput(animal.createdAt),
    updatedAt: normalizeDateOutput(animal.updatedAt),
    ageYears: age,
    shortDescription: description,
    image: primaryImageUrl,
    facts: `${ANIMAL_SPECIES_LABELS[species] ?? species} | ${ageText} | ${ANIMAL_GENDER_LABELS[gender] ?? gender}`,
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

  if (['true', '1', 'yes', '\u0434\u0430'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', '\u043d\u0435'].includes(normalizedValue)) {
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

  return dateValue.toISOString();
}

function normalizeImageUrls(payload, options = {}) {
  if (payload.imageUrls !== undefined) {
    if (!Array.isArray(payload.imageUrls)) {
      throw createHttpError(400, 'Полето "imageUrls" трябва да бъде масив от адреси.');
    }

    return payload.imageUrls
      .map((entry) => normalizeDisplayText(entry))
      .filter(Boolean);
  }

  if (payload.imageUrl !== undefined) {
    const imageUrl = normalizeDisplayText(payload.imageUrl);
    return imageUrl ? [imageUrl] : [];
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

function canUseAnimalsMockFallback() {
  return !isDatabaseConnected() && isAnimalsMockFallbackEnabled();
}

function assertAnimalsDataSourceAvailable() {
  if (isDatabaseConnected() || canUseAnimalsMockFallback()) {
    return;
  }

  throw createHttpError(
    503,
    'Модулът за животни не е достъпен, защото няма активна връзка с MongoDB и mock fallback режимът е изключен.'
  );
}

function assertAnimalsMockFallbackAllowed() {
  assertAnimalsDataSourceAvailable();

  if (!canUseAnimalsMockFallback()) {
    throw createHttpError(
      503,
      'Mock fallback режимът за Animals модула не е активиран в текущата среда.'
    );
  }
}

async function readMockAnimals() {
  assertAnimalsMockFallbackAllowed();
  return loadJsonFile(ANIMALS_DATA_PATH);
}

async function writeMockAnimals(animals) {
  assertAnimalsMockFallbackAllowed();
  return saveJsonFile(ANIMALS_DATA_PATH, animals);
}

function findMockAnimalIndex(animals, animalId) {
  const normalizedAnimalId = assertValidAnimalId(animalId);
  return animals.findIndex((entry) => entry.slug === normalizedAnimalId);
}

async function findAnimalRecordById(animalId) {
  const normalizedAnimalId = assertValidAnimalId(animalId);

  if (isDatabaseConnected()) {
    return Animal.findOne(buildLookupQuery(normalizedAnimalId)).lean();
  }

  const animals = await readMockAnimals();
  return animals.find((entry) => entry.slug === normalizedAnimalId) ?? null;
}

async function ensureUniqueSlug(slug, currentAnimal = null) {
  if (isDatabaseConnected()) {
    const query = { slug };

    if (currentAnimal?._id) {
      query._id = { $ne: currentAnimal._id };
    }

    const existingAnimal = await Animal.findOne(query).lean();

    if (existingAnimal) {
      throw createHttpError(409, 'Вече съществува животно със същия slug.');
    }

    return;
  }

  const animals = await readMockAnimals();
  const isDuplicate = animals.some(
    (entry) => entry.slug === slug && entry.slug !== currentAnimal?.slug
  );

  if (isDuplicate) {
    throw createHttpError(409, 'Вече съществува животно със същия slug.');
  }
}

function synchronizeStatusAndActivity(status, isActive, currentAnimal = null) {
  const nextStatus = status ?? currentAnimal?.status ?? 'available';

  if (INACTIVE_ANIMAL_STATUSES.has(nextStatus)) {
    return {
      status: nextStatus,
      isActive: false,
    };
  }

  if (typeof isActive === 'boolean') {
    return {
      status: nextStatus,
      isActive,
    };
  }

  if (status !== undefined) {
    return {
      status: nextStatus,
      isActive: true,
    };
  }

  return {
    status: nextStatus,
    isActive: currentAnimal?.isActive ?? true,
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
  const partial = Boolean(options.partial);
  const currentAnimal = options.currentAnimal ?? null;
  const normalizedPayload = {};
  let hasExplicitChanges = false;

  if (!partial || payload.slug !== undefined) {
    const rawSlugSource = payload.slug ?? payload.name ?? currentAnimal?.slug;
    const slug = slugify(rawSlugSource);

    if (!slug) {
      throw createHttpError(400, 'Не може да бъде генериран валиден slug за животното.');
    }

    normalizedPayload.slug = slug;
    hasExplicitChanges = true;
  }

  if (!partial || payload.name !== undefined) {
    const name = normalizeDisplayText(payload.name);

    if (!name) {
      throw createHttpError(400, 'Полето "name" е задължително.');
    }

    normalizedPayload.name = name;
    hasExplicitChanges = true;
  }

  if (payload.displayName !== undefined) {
    normalizedPayload.displayName = normalizeDisplayText(payload.displayName);
    hasExplicitChanges = true;
  }

  if (!partial || payload.species !== undefined || payload.type !== undefined) {
    const species = normalizeSpecies(payload.species ?? payload.type);

    if (!species || !ANIMAL_SPECIES_VALUES.includes(species)) {
      throw createHttpError(400, 'Полето "species" съдържа невалидна стойност.');
    }

    normalizedPayload.species = species;
    hasExplicitChanges = true;
  }

  if (!partial || payload.breed !== undefined) {
    const breed = normalizeDisplayText(payload.breed);

    if (!breed) {
      throw createHttpError(400, 'Полето "breed" е задължително.');
    }

    normalizedPayload.breed = breed;
    hasExplicitChanges = true;
  }

  if (!partial || payload.age !== undefined || payload.ageYears !== undefined) {
    normalizedPayload.age = parseNumberField(payload.age ?? payload.ageYears, 'age');
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

    normalizedPayload.status = status;
    hasExplicitChanges = true;
  }

  if (!partial || payload.intakeDate !== undefined) {
    normalizedPayload.intakeDate = parseDateField(payload.intakeDate, 'intakeDate');
    hasExplicitChanges = true;
  }

  if (!partial || payload.healthStatus !== undefined) {
    const healthStatus = normalizeDisplayText(payload.healthStatus);

    if (!healthStatus) {
      throw createHttpError(400, 'Полето "healthStatus" е задължително.');
    }

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

  if (payload.isActive !== undefined) {
    normalizedPayload.isActive = parseBooleanField(payload.isActive, 'isActive');
    hasExplicitChanges = true;
  }

  if (!partial || payload.description !== undefined || payload.shortDescription !== undefined) {
    const description = normalizeDisplayText(payload.description ?? payload.shortDescription);

    if (!description) {
      throw createHttpError(400, 'Полето "description" е задължително.');
    }

    normalizedPayload.description = description;
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

  const statusAndActivity = synchronizeStatusAndActivity(
    normalizedPayload.status,
    normalizedPayload.isActive,
    currentAnimal
  );

  assertAllowedStatusTransition(currentAnimal?.status, statusAndActivity.status);

  normalizedPayload.status = statusAndActivity.status;
  normalizedPayload.isActive = statusAndActivity.isActive;

  return normalizedPayload;
}

function normalizeStatusUpdatePayload(payload, currentAnimal) {
  const status = normalizeText(payload.status);

  if (!ANIMAL_STATUS_VALUES.includes(status)) {
    throw createHttpError(400, 'Полето "status" съдържа невалидна стойност.');
  }

  const isActive =
    payload.isActive !== undefined
      ? parseBooleanField(payload.isActive, 'isActive')
      : currentAnimal?.isActive;

  const nextStatusAndActivity = synchronizeStatusAndActivity(status, isActive, currentAnimal);
  assertAllowedStatusTransition(currentAnimal?.status, nextStatusAndActivity.status);
  return nextStatusAndActivity;
}

function normalizeDeactivatePayload(payload, currentAnimal) {
  const requestedStatus = normalizeText(payload.status ?? payload.mode ?? 'inactive');

  if (!['inactive', 'archived'].includes(requestedStatus)) {
    throw createHttpError(
      400,
      'Deactivate операцията позволява само статус "inactive" или "archived".'
    );
  }

  const isActive =
    payload.isActive !== undefined
      ? parseBooleanField(payload.isActive, 'isActive')
      : false;

  const nextStatusAndActivity = synchronizeStatusAndActivity(
    requestedStatus,
    isActive,
    currentAnimal
  );

  assertAllowedStatusTransition(currentAnimal?.status, nextStatusAndActivity.status);
  return nextStatusAndActivity;
}

function parsePositiveInteger(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw createHttpError(400, 'Параметърът "' + fieldName + '" трябва да бъде положително цяло число.');
  }

  return numericValue;
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
    mongo: { [field]: direction },
  };
}

function comparePrimitiveValues(leftValue, rightValue) {
  if (leftValue === rightValue) {
    return 0;
  }

  if (leftValue === undefined || leftValue === null) {
    return 1;
  }

  if (rightValue === undefined || rightValue === null) {
    return -1;
  }

  if (typeof leftValue === 'string' || typeof rightValue === 'string') {
    return String(leftValue).localeCompare(String(rightValue), 'bg', { sensitivity: 'base' });
  }

  if (leftValue < rightValue) {
    return -1;
  }

  return 1;
}

function sortAnimals(animals, sortDefinition) {
  return [...animals].sort((leftAnimal, rightAnimal) => {
    const fieldComparison =
      comparePrimitiveValues(leftAnimal[sortDefinition.field], rightAnimal[sortDefinition.field]) *
      sortDefinition.direction;

    if (fieldComparison !== 0) {
      return fieldComparison;
    }

    return comparePrimitiveValues(leftAnimal.name, rightAnimal.name);
  });
}

function normalizeAnimalListOptions(filters = {}) {
  const hasExplicitPagination =
    filters.page !== undefined ||
    filters.limit !== undefined ||
    filters.pageSize !== undefined;

  const page = parsePositiveInteger(filters.page, 'page', 1);
  const limit = parsePositiveInteger(filters.limit ?? filters.pageSize, 'limit', hasExplicitPagination ? 12 : null);
  const sort = normalizeSortValue(filters.sort);
  const sortDefinition = resolveSortDefinition(sort);

  return {
    page,
    limit,
    sort,
    sortDefinition,
    hasExplicitPagination,
  };
}

function buildPaginatedResult(items, options) {
  const total = items.length;
  const effectiveLimit = (options.limit ?? total) || 1;
  const totalPages = total === 0 ? 0 : Math.ceil(total / effectiveLimit);
  const safePage = totalPages === 0 ? 1 : Math.min(options.page, totalPages);
  const startIndex = options.limit ? (safePage - 1) * options.limit : 0;
  const pagedItems = options.limit ? items.slice(startIndex, startIndex + options.limit) : items;

  return {
    items: pagedItems,
    total,
    pagination: {
      page: safePage,
      limit: effectiveLimit,
      total,
      totalPages,
      hasNextPage: totalPages > 0 && safePage < totalPages,
      hasPreviousPage: totalPages > 0 && safePage > 1,
    },
    sort: options.sort,
  };
}

function applyLocalFilters(animals, filters) {
  const query = normalizeText(filters.query);
  const species = normalizeSpecies(filters.species);
  const size = normalizeSize(filters.size);
  const status = normalizeText(filters.status);

  return animals.filter((animal) => {
    const normalizedSpecies = normalizeSpecies(animal.species ?? animal.type);
    const normalizedSize = normalizeSize(animal.size);
    const normalizedStatus = normalizeText(animal.status);

    const matchesQuery =
      !query ||
      normalizeText(animal.name).includes(query) ||
      normalizedSpecies.includes(query) ||
      normalizeText(animal.breed).includes(query);

    const matchesSpecies = !species || normalizedSpecies === species;
    const matchesSize = !size || normalizedSize === size;
    const matchesStatus = !status || normalizedStatus === status;

    return matchesQuery && matchesSpecies && matchesSize && matchesStatus;
  });
}

function buildMongoFilters(filters) {
  const query = normalizeText(filters.query);
  const species = normalizeSpecies(filters.species);
  const size = normalizeSize(filters.size);
  const status = normalizeText(filters.status);
  const mongoFilters = {};

  if (query) {
    const regex = new RegExp(escapeRegex(query), 'i');
    mongoFilters.$or = [{ name: regex }, { species: regex }, { breed: regex }];
  }

  if (species) {
    mongoFilters.species = species;
  }

  if (size) {
    mongoFilters.size = size;
  }

  if (status) {
    mongoFilters.status = status;
  }

  return mongoFilters;
}

export function getAnimalModulePolicy(roleCandidate) {
  return {
    resource: 'animals',
    allowedActions: getAllowedAnimalActions(roleCandidate),
  };
}

export async function getAnimalsCollection(filters = {}) {
  const listOptions = normalizeAnimalListOptions(filters);

  if (isDatabaseConnected()) {
    const mongoFilters = buildMongoFilters(filters);
    const total = await Animal.countDocuments(mongoFilters);
    const effectiveLimit = (listOptions.limit ?? total) || 1;
    const totalPages = total === 0 ? 0 : Math.ceil(total / effectiveLimit);
    const safePage = totalPages === 0 ? 1 : Math.min(listOptions.page, totalPages);
    const query = Animal.find(mongoFilters).sort(listOptions.sortDefinition.mongo);

    if (listOptions.limit) {
      query.skip((safePage - 1) * listOptions.limit).limit(listOptions.limit);
    }

    const animals = await query.lean();
    const items = animals.map(serializeAnimal);

    return {
      items,
      total,
      pagination: {
        page: safePage,
        limit: effectiveLimit,
        total,
        totalPages,
        hasNextPage: totalPages > 0 && safePage < totalPages,
        hasPreviousPage: totalPages > 0 && safePage > 1,
      },
      sort: listOptions.sort,
    };
  }

  const mockAnimals = await readMockAnimals();
  const filteredAnimals = applyLocalFilters(mockAnimals, filters).map(serializeAnimal);
  const sortedAnimals = sortAnimals(filteredAnimals, listOptions.sortDefinition);
  return buildPaginatedResult(sortedAnimals, listOptions);
}

export async function getAnimalById(animalId) {
  const animal = await findAnimalRecordById(animalId);
  return animal ? serializeAnimal(animal) : null;
}

export async function createAnimal(payload) {
  const normalizedPayload = normalizeAnimalWritePayload(payload);
  await ensureUniqueSlug(normalizedPayload.slug);

  if (isDatabaseConnected()) {
    const createdAnimal = await Animal.create(normalizedPayload);
    return serializeAnimal(createdAnimal.toObject());
  }

  const animals = await readMockAnimals();
  const now = new Date().toISOString();
  const animalRecord = {
    ...normalizedPayload,
    createdAt: now,
    updatedAt: now,
  };

  animals.push(animalRecord);
  await writeMockAnimals(animals);

  return serializeAnimal(animalRecord);
}

export async function updateAnimal(animalId, payload) {
  const currentAnimal = await findAnimalRecordById(animalId);

  if (!currentAnimal) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  const normalizedPayload = normalizeAnimalWritePayload(payload, {
    partial: true,
    currentAnimal,
  });

  if (normalizedPayload.slug && normalizedPayload.slug !== currentAnimal.slug) {
    await ensureUniqueSlug(normalizedPayload.slug, currentAnimal);
  }

  if (isDatabaseConnected()) {
    const updatedAnimal = await Animal.findOneAndUpdate(buildLookupQuery(animalId), normalizedPayload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedAnimal) {
      throw createHttpError(404, 'Животното не беше намерено.');
    }

    return serializeAnimal(updatedAnimal);
  }

  const animals = await readMockAnimals();
  const animalIndex = findMockAnimalIndex(animals, animalId);

  if (animalIndex === -1) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  const updatedAnimal = {
    ...animals[animalIndex],
    ...normalizedPayload,
    updatedAt: new Date().toISOString(),
  };

  animals[animalIndex] = updatedAnimal;
  await writeMockAnimals(animals);

  return serializeAnimal(updatedAnimal);
}

export async function updateAnimalStatus(animalId, payload) {
  const currentAnimal = await findAnimalRecordById(animalId);

  if (!currentAnimal) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  const normalizedPayload = normalizeStatusUpdatePayload(payload, currentAnimal);

  if (isDatabaseConnected()) {
    const updatedAnimal = await Animal.findOneAndUpdate(buildLookupQuery(animalId), normalizedPayload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedAnimal) {
      throw createHttpError(404, 'Животното не беше намерено.');
    }

    return serializeAnimal(updatedAnimal);
  }

  const animals = await readMockAnimals();
  const animalIndex = findMockAnimalIndex(animals, animalId);

  if (animalIndex === -1) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  const updatedAnimal = {
    ...animals[animalIndex],
    ...normalizedPayload,
    updatedAt: new Date().toISOString(),
  };

  animals[animalIndex] = updatedAnimal;
  await writeMockAnimals(animals);

  return serializeAnimal(updatedAnimal);
}

export async function deactivateAnimal(animalId, payload = {}) {
  const currentAnimal = await findAnimalRecordById(animalId);

  if (!currentAnimal) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  const normalizedPayload = normalizeDeactivatePayload(payload, currentAnimal);

  if (isDatabaseConnected()) {
    const updatedAnimal = await Animal.findOneAndUpdate(buildLookupQuery(animalId), normalizedPayload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedAnimal) {
      throw createHttpError(404, 'Животното не беше намерено.');
    }

    return serializeAnimal(updatedAnimal);
  }

  const animals = await readMockAnimals();
  const animalIndex = findMockAnimalIndex(animals, animalId);

  if (animalIndex === -1) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  const updatedAnimal = {
    ...animals[animalIndex],
    ...normalizedPayload,
    updatedAt: new Date().toISOString(),
  };

  animals[animalIndex] = updatedAnimal;
  await writeMockAnimals(animals);

  return serializeAnimal(updatedAnimal);
}

