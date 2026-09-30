export const RESCUE_STORY_OUTCOME_STATUS_VALUES = Object.freeze([
  'adopted',
  'recovered',
  'released',
]);

export const RESCUE_STORY_OUTCOME_STATUS_LABELS = Object.freeze({
  adopted: 'Осиновено',
  recovered: 'Възстановено',
  released: 'Върнато в природата',
});

export const RESCUE_STORY_OUTCOME_STATUS_CLASSES = Object.freeze({
  adopted: 'is-adopted',
  recovered: 'is-recovered',
  released: 'is-released',
});

export const RESCUE_STORY_PUBLICATION_STATUS_VALUES = Object.freeze([
  'draft',
  'published',
  'unpublished',
  'archived',
]);

export const RESCUE_STORY_PUBLICATION_STATUS_LABELS = Object.freeze({
  draft: 'Чернова',
  published: 'Публикувана',
  unpublished: 'Скрита',
  archived: 'Архивирана',
});

export const RESCUE_STORY_TEXT_LIMITS = Object.freeze({
  title: 180,
  slug: 96,
  animalName: 100,
  submittedBy: 120,
  summary: 1000,
  content: 6000,
  imageUrl: 512,
  imageAlt: 300,
});

export const RESCUE_STORY_SLUG_PATTERN = /^[a-z0-9а-яё]+(?:-[a-z0-9а-яё]+)*$/i;

export const RESCUE_STORY_EDITABLE_FIELDS = Object.freeze([
  'title',
  'slug',
  'animalName',
  'animalType',
  'submittedBy',
  'outcomeStatus',
  'summary',
  'content',
  'imageUrl',
  'imageAlt',
]);

export const RESCUE_STORY_PUBLIC_LIMIT_MAX = 24;
export const RESCUE_STORY_PUBLIC_PAGE_SIZE = 6;
