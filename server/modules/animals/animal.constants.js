export const ANIMAL_STATUS_VALUES = [
  'available',
  'reserved',
  'adopted',
  'medical-care',
  'under-care',
  'protected-care',
  'released',
  'inactive',
  'archived',
];

export const ANIMAL_GENDER_VALUES = ['male', 'female', 'unknown'];

export const ANIMAL_SIZE_VALUES = ['small', 'medium', 'large', 'extra-large'];

export const ANIMAL_SPECIES_VALUES = [
  'dog',
  'cat',
  'rabbit',
  'fox',
  'lizard',
  'owl',
  'horse',
  'hedgehog',
];

export const ANIMAL_ID_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ANIMAL_SORT_VALUES = [
  'name-asc',
  'name-desc',
  'createdAt-desc',
  'createdAt-asc',
  'updatedAt-desc',
  'updatedAt-asc',
  'intakeDate-desc',
  'intakeDate-asc',
  'age-desc',
  'age-asc',
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

export const ANIMAL_GENDER_LABELS = {
  male: 'Мъжки',
  female: 'Женски',
  unknown: 'Неуточнен',
};

export const ANIMAL_SIZE_LABELS = {
  small: 'Малка',
  medium: 'Средна',
  large: 'Голяма',
  'extra-large': 'Много голяма',
};

export const ANIMAL_SPECIES_LABELS = {
  dog: 'Куче',
  cat: 'Котка',
  rabbit: 'Зайче',
  fox: 'Лисица',
  lizard: 'Гущер',
  owl: 'Сова',
  horse: 'Кон',
  hedgehog: 'Таралеж',
};
