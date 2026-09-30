export const ANIMAL_STATUS_VALUES = Object.freeze([
  'available',
  'reserved',
  'adopted',
  'medical-care',
  'under-care',
  'protected-care',
  'released',
  'inactive',
  'archived',
]);

export const PUBLIC_ANIMAL_LIST_STATUS_VALUES = Object.freeze([
  'available',
  'under-care',
  'protected-care',
]);

export const ANIMAL_SYSTEM_MANAGED_STATUS_VALUES = Object.freeze(['reserved', 'adopted']);

export const ANIMAL_CREATABLE_STATUS_VALUES = Object.freeze([
  'available',
  'medical-care',
  'under-care',
  'protected-care',
  'released',
]);

export const ANIMAL_MANUAL_STATUS_VALUES = Object.freeze(
  ANIMAL_STATUS_VALUES.filter((status) => !ANIMAL_SYSTEM_MANAGED_STATUS_VALUES.includes(status))
);

export const ANIMAL_IMAGE_MAX_COUNT = 3;
export const ANIMAL_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const ANIMAL_IMAGE_MAX_TOTAL_BYTES = 6 * 1024 * 1024;
export const ANIMAL_IMAGE_URL_MAX_LENGTH = 2048;
export const ANIMAL_IMAGE_DATA_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ANIMAL_TEXT_LIMITS = Object.freeze({
  slug: 120,
  name: 100,
  displayName: 100,
  breed: 120,
  healthStatus: 1000,
  description: 3000,
  story: 5000,
  historyAndCharacter: 5000,
  details: 3000,
  careConditions: 5000,
});

export const ANIMAL_GENDER_VALUES = Object.freeze(['male', 'female', 'unknown']);

export const ANIMAL_SIZE_VALUES = Object.freeze(['small', 'medium', 'large', 'extra-large']);

export const ANIMAL_SPECIES_VALUES = Object.freeze([
  'dog',
  'cat',
  'rabbit',
  'fox',
  'lizard',
  'owl',
  'horse',
  'hedgehog',
]);

// Status transitions are shared so frontend options and backend enforcement
// always use the same animal lifecycle rules.
export const ANIMAL_STATUS_TRANSITIONS = Object.freeze({
  available: Object.freeze([
    'reserved',
    'medical-care',
    'under-care',
    'protected-care',
    'inactive',
    'archived',
  ]),
  reserved: Object.freeze(['available', 'adopted']),
  adopted: Object.freeze(['archived']),
  'medical-care': Object.freeze([
    'available',
    'under-care',
    'protected-care',
    'released',
    'inactive',
    'archived',
  ]),
  'under-care': Object.freeze([
    'available',
    'medical-care',
    'protected-care',
    'released',
    'inactive',
    'archived',
  ]),
  'protected-care': Object.freeze([
    'under-care',
    'medical-care',
    'released',
    'inactive',
    'archived',
  ]),
  released: Object.freeze(['protected-care', 'medical-care', 'archived']),
  inactive: Object.freeze([
    'available',
    'medical-care',
    'under-care',
    'protected-care',
    'archived',
  ]),
  archived: Object.freeze([]),
});

export const ANIMAL_STATUS_LABELS = Object.freeze({
  available: 'Готово за осиновяване',
  reserved: 'Резервирано',
  adopted: 'Осиновено',
  'medical-care': 'Медицинска грижа',
  'under-care': 'Под грижа',
  'protected-care': 'Защитена грижа',
  released: 'Върнато в природата',
  inactive: 'Неактивно',
  archived: 'Архивирано',
});

export const ANIMAL_GENDER_LABELS = Object.freeze({
  male: 'Мъжки',
  female: 'Женски',
  unknown: 'Неуточнен',
});

export const ANIMAL_SIZE_LABELS = Object.freeze({
  small: 'Малка',
  medium: 'Средна',
  large: 'Голяма',
  'extra-large': 'Много голяма',
});

export const ANIMAL_SPECIES_LABELS = Object.freeze({
  dog: 'Куче',
  cat: 'Котка',
  rabbit: 'Зайче',
  fox: 'Лисица',
  lizard: 'Гущер',
  owl: 'Сова',
  horse: 'Кон',
  hedgehog: 'Таралеж',
});

export const PROTECTED_CARE_SPECIES_VALUES = Object.freeze(['fox', 'owl', 'hedgehog']);
