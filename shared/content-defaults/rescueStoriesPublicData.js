import {
  RESCUE_STORY_OUTCOME_STATUS_CLASSES,
  RESCUE_STORY_OUTCOME_STATUS_LABELS,
} from '../domain/rescueStoryConstants.js';

export const RESCUE_STORY_STATUS_LABELS = RESCUE_STORY_OUTCOME_STATUS_LABELS;
export const RESCUE_STORY_STATUS_CLASSES = RESCUE_STORY_OUTCOME_STATUS_CLASSES;

export const STATUS_BY_LEGACY_LABEL = {
  Осиновено: 'adopted',
  Възстановено: 'recovered',
  'Върнато в природата': 'released',
};

export function normalizeRescueStoryCollection(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((story) => ({
    ...story,
    summary: story.summary || story.content,
    imageUrl: story.imageUrl || story.imageSrc || '',
    outcomeStatus: story.outcomeStatus || STATUS_BY_LEGACY_LABEL[story.status] || 'recovered',
  }));
}
