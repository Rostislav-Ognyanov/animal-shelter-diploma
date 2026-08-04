import RescueStory, { RESCUE_STORY_OUTCOME_STATUS_VALUES } from '../../models/RescueStory.js';
import { createHttpError } from '../../utils/httpError.js';
import { hasPermission } from '../shared/rolePolicies.js';

const STORY_ID_PATTERN = /^[0-9a-f]{24}$/i;
const OUTCOME_STATUS_SET = new Set(RESCUE_STORY_OUTCOME_STATUS_VALUES);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function normalizeBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return Boolean(value);
}

function normalizeOutcomeStatus(value) {
  const status = normalizeText(value).toLowerCase();

  if (!OUTCOME_STATUS_SET.has(status)) {
    throw createHttpError(400, 'Избери валиден статус на историята.');
  }

  return status;
}

function normalizeStoryPayload(payload = {}, existingStory = null) {
  const title = normalizeText(payload.title ?? existingStory?.title);
  const animalName = normalizeText(payload.animalName ?? existingStory?.animalName);
  const animalType = normalizeText(payload.animalType ?? existingStory?.animalType);
  const submittedBy = normalizeText(payload.submittedBy ?? existingStory?.submittedBy);
  const content = normalizeText(payload.content ?? existingStory?.content);
  const summary = normalizeText(payload.summary ?? existingStory?.summary);
  const imageUrl = normalizeText(payload.imageUrl ?? existingStory?.imageUrl);
  const imageAlt = normalizeText(payload.imageAlt ?? existingStory?.imageAlt);
  const outcomeStatus = normalizeOutcomeStatus(payload.outcomeStatus ?? existingStory?.outcomeStatus);
  const slug = normalizeText(payload.slug) || slugify(`${animalName}-${title}`);

  if (!title || !animalName || !animalType || !submittedBy || !content || !slug) {
    throw createHttpError(400, 'Попълни заглавие, животно, автор, история и slug.');
  }

  return {
    title,
    slug,
    animalName,
    animalType,
    submittedBy,
    outcomeStatus,
    summary,
    content,
    imageUrl,
    imageAlt,
    isPublished: normalizeBoolean(payload.isPublished, existingStory?.isPublished ?? true),
    isFeatured: normalizeBoolean(payload.isFeatured, existingStory?.isFeatured ?? false),
    featuredOrder: Number.isFinite(Number(payload.featuredOrder ?? existingStory?.featuredOrder))
      ? Number(payload.featuredOrder ?? existingStory?.featuredOrder)
      : 0,
  };
}

function assertPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'rescueStories', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function assertStoryId(storyId) {
  const normalizedId = normalizeText(storyId);

  if (!STORY_ID_PATTERN.test(normalizedId)) {
    throw createHttpError(400, 'Идентификаторът на историята е невалиден.');
  }

  return normalizedId;
}

function serializeStory(story) {
  return {
    id: String(story._id),
    title: story.title,
    slug: story.slug,
    animalName: story.animalName,
    animalType: story.animalType,
    submittedBy: story.submittedBy,
    outcomeStatus: story.outcomeStatus,
    summary: story.summary,
    content: story.content,
    imageUrl: story.imageUrl,
    imageAlt: story.imageAlt,
    isPublished: Boolean(story.isPublished),
    isFeatured: Boolean(story.isFeatured),
    featuredOrder: story.featuredOrder ?? 0,
    publishedAt: story.publishedAt,
    archivedAt: story.archivedAt,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    updatedBy: story.updatedBy ? String(story.updatedBy) : null,
  };
}

export async function listPublishedRescueStories(filters = {}) {
  const query = { isPublished: true };

  if (normalizeText(filters.animalType)) {
    query.animalType = normalizeText(filters.animalType);
  }

  if (normalizeText(filters.outcomeStatus)) {
    query.outcomeStatus = normalizeOutcomeStatus(filters.outcomeStatus);
  }

  if (String(filters.featured ?? '') === 'true') {
    query.isFeatured = true;
  }

  const limit = Number.isFinite(Number(filters.limit)) ? Math.max(1, Math.min(Number(filters.limit), 24)) : 0;
  const databaseQuery = RescueStory.find(query).sort({ isFeatured: -1, featuredOrder: 1, publishedAt: -1, _id: 1 });

  if (limit > 0) {
    databaseQuery.limit(limit);
  }

  const stories = await databaseQuery.lean();
  return stories.map(serializeStory);
}

export async function listRescueStoryRecords(currentUser) {
  assertPermission(currentUser, 'view-all');

  const stories = await RescueStory.find({}).sort({ createdAt: -1, _id: 1 }).lean();
  return stories.map(serializeStory);
}

export async function createRescueStory(payload, currentUser) {
  assertPermission(currentUser, 'create');

  const storyPayload = normalizeStoryPayload(payload);
  const story = await RescueStory.create({
    ...storyPayload,
    publishedAt: storyPayload.isPublished ? new Date() : null,
    updatedBy: currentUser.id,
  });

  return serializeStory(story.toObject());
}

export async function updateRescueStory(storyId, payload, currentUser) {
  assertPermission(currentUser, 'update');

  const normalizedStoryId = assertStoryId(storyId);
  const existingStory = await RescueStory.findById(normalizedStoryId);

  if (!existingStory) {
    throw createHttpError(404, 'Историята не беше намерена.');
  }

  const storyPayload = normalizeStoryPayload(payload, existingStory);
  const wasUnpublished = !existingStory.isPublished && storyPayload.isPublished;

  Object.assign(existingStory, storyPayload, {
    publishedAt: wasUnpublished && !existingStory.publishedAt ? new Date() : existingStory.publishedAt,
    archivedAt: storyPayload.isPublished ? null : existingStory.archivedAt,
    updatedBy: currentUser.id,
  });

  await existingStory.save();
  return serializeStory(existingStory.toObject());
}

export async function archiveRescueStory(storyId, currentUser) {
  assertPermission(currentUser, 'archive');

  const normalizedStoryId = assertStoryId(storyId);
  const story = await RescueStory.findByIdAndUpdate(
    normalizedStoryId,
    {
      $set: {
        isPublished: false,
        isFeatured: false,
        archivedAt: new Date(),
        updatedBy: currentUser.id,
      },
    },
    { new: true, runValidators: true }
  ).lean();

  if (!story) {
    throw createHttpError(404, 'Историята не беше намерена.');
  }

  return serializeStory(story);
}
