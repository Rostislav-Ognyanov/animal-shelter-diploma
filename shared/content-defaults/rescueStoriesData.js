import { RESCUE_STORIES_PAGE_ITEMS } from './rescueStoriesPageData.js';
import { STATUS_BY_LEGACY_LABEL } from './rescueStoriesPublicData.js';
import { RESCUE_STORY_TEXT_LIMITS } from '../domain/rescueStoryConstants.js';

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, RESCUE_STORY_TEXT_LIMITS.slug)
    .replace(/-+$/g, '');
}

function normalizeLegacyStory(story) {
  const outcomeStatus = STATUS_BY_LEGACY_LABEL[story.status] ?? 'recovered';

  return {
    id: story.title,
    title: story.title,
    slug: slugify(story.title),
    animalName: story.animalName,
    animalType: story.animalType,
    submittedBy: story.submittedBy,
    outcomeStatus,
    summary: story.text,
    content: story.text,
    imageUrl: story.imageUrl ?? story.imageSrc,
    imageAlt: story.imageAlt,
    isPublished: true,
  };
}

export const DEFAULT_RESCUE_STORIES = RESCUE_STORIES_PAGE_ITEMS.map(normalizeLegacyStory);
