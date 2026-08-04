import { RESCUE_STORIES_PAGE_ITEMS } from './rescueStoriesPageData.js';

export const RESCUE_STORY_STATUS_LABELS = {
  adopted: 'Осиновено',
  recovered: 'Възстановено',
  released: 'Върнато в природата',
};

export const RESCUE_STORY_STATUS_CLASSES = {
  adopted: 'is-adopted',
  recovered: 'is-recovered',
  released: 'is-released',
};

const STATUS_BY_LEGACY_LABEL = {
  Осиновено: 'adopted',
  Възстановено: 'recovered',
  'Върнато в природата': 'released',
};

function normalizeLegacyStory(story, index) {
  const outcomeStatus = STATUS_BY_LEGACY_LABEL[story.status] ?? 'recovered';

  return {
    id: story.title,
    title: story.title,
    slug: story.title.toLowerCase().replace(/\s+/g, '-'),
    animalName: story.animalName,
    animalType: story.animalType,
    submittedBy: story.submittedBy,
    outcomeStatus,
    summary: story.text,
    content: story.text,
    imageUrl: story.imageUrl ?? story.imageSrc,
    imageAlt: story.imageAlt,
    isPublished: true,
    isFeatured: index < 3,
    featuredOrder: index + 1,
  };
}

export const DEFAULT_RESCUE_STORIES = RESCUE_STORIES_PAGE_ITEMS.map(normalizeLegacyStory);

export function normalizeRescueStoryCollection(items, fallbackItems = DEFAULT_RESCUE_STORIES) {
  if (!Array.isArray(items) || items.length === 0) {
    return fallbackItems;
  }

  return items.map((story) => ({
    ...story,
    summary: story.summary || story.content,
    imageUrl: story.imageUrl || story.imageSrc || '',
    outcomeStatus: story.outcomeStatus || STATUS_BY_LEGACY_LABEL[story.status] || 'recovered',
  }));
}
