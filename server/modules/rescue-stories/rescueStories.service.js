import RescueStory from '../../models/RescueStory.js';
import { assertImageAltText, normalizeImageUrl } from '../../utils/contentUrls.js';
import { createHttpError } from '../../utils/httpError.js';
import { createDuplicateKeyHttpError } from '../../utils/mongoErrors.js';
import {
  applyPagination,
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { ANIMAL_SPECIES_VALUES } from '../../../shared/domain/animalConstants.js';
import {
  RESCUE_STORY_EDITABLE_FIELDS,
  RESCUE_STORY_OUTCOME_STATUS_VALUES,
  RESCUE_STORY_PUBLIC_LIMIT_MAX,
  RESCUE_STORY_PUBLIC_PAGE_SIZE,
  RESCUE_STORY_SLUG_PATTERN,
  RESCUE_STORY_TEXT_LIMITS,
} from '../../../shared/domain/rescueStoryConstants.js';
import { notifyUnreadUsersByRole } from '../notifications/notifications.service.js';
import { hasPermission } from '../shared/rolePolicies.js';

const STORY_ID_PATTERN = /^[0-9a-f]{24}$/i;
const OUTCOME_STATUS_SET = new Set(RESCUE_STORY_OUTCOME_STATUS_VALUES);
const ANIMAL_TYPE_SET = new Set(ANIMAL_SPECIES_VALUES);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLimitedText(value, fieldName, maxLength) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.length > maxLength) {
    throw createHttpError(400, `${fieldName} не може да надвишава ${maxLength} символа.`);
  }

  return normalizedValue;
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, RESCUE_STORY_TEXT_LIMITS.slug)
    .replace(/-+$/g, '');
}

function normalizeSlug(value) {
  const slug = normalizeLimitedText(value, 'Slug', RESCUE_STORY_TEXT_LIMITS.slug).toLowerCase();

  if (!slug || !RESCUE_STORY_SLUG_PATTERN.test(slug)) {
    throw createHttpError(
      400,
      'Slug може да съдържа само букви, цифри и единични тирета между тях.'
    );
  }

  return slug;
}

function normalizeOutcomeStatus(value) {
  const status = normalizeText(value).toLowerCase();

  if (!OUTCOME_STATUS_SET.has(status)) {
    throw createHttpError(400, 'Избери валиден статус на историята.');
  }

  return status;
}

function normalizeAnimalType(value) {
  const animalType = normalizeText(value).toLowerCase();

  if (!ANIMAL_TYPE_SET.has(animalType)) {
    throw createHttpError(400, 'Избери валиден вид животно.');
  }

  return animalType;
}

function normalizePublicLimit(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1 || limit > RESCUE_STORY_PUBLIC_LIMIT_MAX) {
    throw createHttpError(
      400,
      `Лимитът трябва да бъде цяло число между 1 и ${RESCUE_STORY_PUBLIC_LIMIT_MAX}.`
    );
  }

  return limit;
}

function normalizeStoryPayload(payload = {}, existingStory = null) {
  const title = normalizeLimitedText(
    payload.title ?? existingStory?.title,
    'Заглавието',
    RESCUE_STORY_TEXT_LIMITS.title
  );
  const animalName = normalizeLimitedText(
    payload.animalName ?? existingStory?.animalName,
    'Името на животното',
    RESCUE_STORY_TEXT_LIMITS.animalName
  );
  const animalType = normalizeAnimalType(payload.animalType ?? existingStory?.animalType);
  const submittedBy = normalizeLimitedText(
    payload.submittedBy ?? existingStory?.submittedBy,
    'Авторът',
    RESCUE_STORY_TEXT_LIMITS.submittedBy
  );
  const content = normalizeLimitedText(
    payload.content ?? existingStory?.content,
    'Съдържанието',
    RESCUE_STORY_TEXT_LIMITS.content
  );
  const summary = normalizeLimitedText(
    payload.summary ?? existingStory?.summary,
    'Краткото резюме',
    RESCUE_STORY_TEXT_LIMITS.summary
  );
  const imageUrl = normalizeImageUrl(payload.imageUrl ?? existingStory?.imageUrl, {
    fieldName: 'Пътят до снимката на историята',
  });
  const imageAlt = assertImageAltText(
    normalizeLimitedText(
      payload.imageAlt ?? existingStory?.imageAlt,
      'Alt текстът',
      RESCUE_STORY_TEXT_LIMITS.imageAlt
    ),
    imageUrl
  );
  const outcomeStatus = normalizeOutcomeStatus(payload.outcomeStatus ?? existingStory?.outcomeStatus);
  const slugCandidate = normalizeText(payload.slug ?? existingStory?.slug);
  const slug = normalizeSlug(slugCandidate || slugify(`${animalName}-${title}`));

  if (!title || !animalName || !submittedBy || !content) {
    throw createHttpError(400, 'Попълни заглавие, животно, вид, автор и пълна история.');
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
  };
}

function createRescueStoryDuplicateConflict(error) {
  return createDuplicateKeyHttpError(error, {
    fieldMessages: {
      slug: 'История с този slug вече съществува.',
    },
    fallbackMessage: 'История с тези данни вече съществува.',
  });
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

function canHidePublishedStory(currentUser) {
  return hasPermission(currentUser?.role, 'rescueStories', 'unpublish');
}

function getPublicationStatus(story) {
  if (story.archivedAt) {
    return 'archived';
  }

  if (story.isPublished) {
    return 'published';
  }

  return story.publishedAt ? 'unpublished' : 'draft';
}

function assertStoryCanBeEdited(story) {
  if (story.archivedAt) {
    throw createHttpError(409, 'Архивирана история не може да бъде редактирана.');
  }

  if (story.isPublished) {
    throw createHttpError(409, 'Скрий публикацията, преди да редактираш историята.');
  }
}

async function notifyAdminsForEmployeeDraft(story, currentUser, type) {
  if (currentUser.role !== 'employee') {
    return;
  }

  try {
    await notifyUnreadUsersByRole(
      ['admin'],
      {
        type,
        title:
          type === 'rescue-story-draft-updated'
            ? 'Обновена спасителна история очаква преглед'
            : 'Нова спасителна история очаква преглед',
        message:
          type === 'rescue-story-draft-updated'
            ? `Служител обнови черновата за историята "${story.title}".`
            : `Служител създаде чернова за историята "${story.title}".`,
        resourceId: story.id,
        dedupeKey: `rescue-story:${story.id}`,
      },
      {
        excludeUserIds: [currentUser.id],
      }
    );
  } catch (error) {
    console.error('Неуспешно изпращане на известие за спасителна история:', error);
  }
}

function serializeStory(story, { includeManagement = false } = {}) {
  const publicStory = {
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
    publishedAt: story.publishedAt,
  };

  if (!includeManagement) {
    return publicStory;
  }

  return {
    ...publicStory,
    isPublished: Boolean(story.isPublished),
    publicationStatus: getPublicationStatus(story),
    archivedAt: story.archivedAt,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    updatedBy: story.updatedBy ? String(story.updatedBy) : null,
  };
}

export async function listPublishedRescueStories(filters = {}) {
  const query = { isPublished: true };

  if (normalizeText(filters.animalType)) {
    query.animalType = normalizeAnimalType(filters.animalType);
  }

  if (normalizeText(filters.outcomeStatus)) {
    query.outcomeStatus = normalizeOutcomeStatus(filters.outcomeStatus);
  }

  const limit = normalizePublicLimit(filters.limit ?? filters.pageSize);

  if (String(filters.random ?? '') === 'true' && limit > 0) {
    const stories = await RescueStory.aggregate([
      { $match: query },
      { $sample: { size: limit } },
    ]);

    const items = stories.map(serializeStory);

    return {
      items,
      total: items.length,
      pagination: null,
    };
  }

  const paginationOptions = normalizePaginationOptions(
    {
      page: filters.page,
      limit: limit || undefined,
    },
    {
      defaultLimit: RESCUE_STORY_PUBLIC_PAGE_SIZE,
      maxLimit: RESCUE_STORY_PUBLIC_LIMIT_MAX,
    }
  );
  const total = await RescueStory.countDocuments(query);
  const pagination = buildPagination(total, paginationOptions);
  const databaseQuery = applyPagination(
    RescueStory.find(query).sort({ publishedAt: -1, _id: 1 }),
    pagination
  );

  const stories = await databaseQuery.lean();

  return {
    items: stories.map(serializeStory),
    total,
    pagination,
  };
}

export async function listRescueStoryRecords(currentUser) {
  assertPermission(currentUser, 'view-all');

  const stories = await RescueStory.find({}).sort({ createdAt: -1, _id: 1 }).lean();
  return stories.map((story) => serializeStory(story, { includeManagement: true }));
}

export async function createRescueStory(payload, currentUser) {
  assertPermission(currentUser, 'create');
  assertBodyObject(payload);
  assertAllowedFields(payload, RESCUE_STORY_EDITABLE_FIELDS);

  const storyPayload = normalizeStoryPayload(payload);
  let story;

  try {
    story = await RescueStory.create({
      ...storyPayload,
      isPublished: false,
      publishedAt: null,
      archivedAt: null,
      updatedBy: currentUser.id,
    });
  } catch (error) {
    throw createRescueStoryDuplicateConflict(error) ?? error;
  }
  const serializedStory = serializeStory(story.toObject(), { includeManagement: true });

  await notifyAdminsForEmployeeDraft(serializedStory, currentUser, 'rescue-story-draft-created');

  return serializedStory;
}

export async function updateRescueStory(storyId, payload, currentUser) {
  assertPermission(currentUser, 'update');
  assertBodyObject(payload);
  assertAllowedFields(payload, RESCUE_STORY_EDITABLE_FIELDS);

  const normalizedStoryId = assertStoryId(storyId);
  const existingStory = await RescueStory.findById(normalizedStoryId);

  if (!existingStory) {
    throw createHttpError(404, 'Историята не беше намерена.');
  }

  assertStoryCanBeEdited(existingStory);

  const storyPayload = normalizeStoryPayload(payload, existingStory);

  Object.assign(existingStory, storyPayload, {
    updatedBy: currentUser.id,
  });

  try {
    await existingStory.save();
  } catch (error) {
    throw createRescueStoryDuplicateConflict(error) ?? error;
  }
  const serializedStory = serializeStory(existingStory.toObject(), { includeManagement: true });

  await notifyAdminsForEmployeeDraft(serializedStory, currentUser, 'rescue-story-draft-updated');

  return serializedStory;
}

export async function publishRescueStory(storyId, currentUser) {
  assertPermission(currentUser, 'publish');

  const normalizedStoryId = assertStoryId(storyId);
  const story = await RescueStory.findById(normalizedStoryId);

  if (!story) {
    throw createHttpError(404, 'Историята не беше намерена.');
  }

  if (story.archivedAt) {
    throw createHttpError(409, 'Архивирана история не може да бъде публикувана.');
  }

  if (story.isPublished) {
    throw createHttpError(409, 'Историята вече е публикувана.');
  }

  Object.assign(story, {
    isPublished: true,
    publishedAt: new Date(),
    updatedBy: currentUser.id,
  });
  await story.save();

  return serializeStory(story.toObject(), { includeManagement: true });
}

export async function unpublishRescueStory(storyId, currentUser) {
  assertPermission(currentUser, 'unpublish');

  const normalizedStoryId = assertStoryId(storyId);
  const story = await RescueStory.findById(normalizedStoryId);

  if (!story) {
    throw createHttpError(404, 'Историята не беше намерена.');
  }

  if (story.archivedAt) {
    throw createHttpError(409, 'Архивирана история не може да бъде скрита повторно.');
  }

  if (!story.isPublished) {
    throw createHttpError(409, 'Историята вече не е публична.');
  }

  Object.assign(story, {
    isPublished: false,
    updatedBy: currentUser.id,
  });
  await story.save();

  return serializeStory(story.toObject(), { includeManagement: true });
}

export async function archiveRescueStory(storyId, currentUser) {
  assertPermission(currentUser, 'archive');

  const normalizedStoryId = assertStoryId(storyId);
  const story = await RescueStory.findById(normalizedStoryId);

  if (!story) {
    throw createHttpError(404, 'Историята не беше намерена.');
  }

  if (story.archivedAt) {
    throw createHttpError(409, 'Историята вече е архивирана.');
  }

  if (story.isPublished && !canHidePublishedStory(currentUser)) {
    throw createHttpError(403, 'Публикувана история може да бъде скрита само от администратор.');
  }

  Object.assign(story, {
    isPublished: false,
    archivedAt: new Date(),
    updatedBy: currentUser.id,
  });

  await story.save();
  return serializeStory(story.toObject(), { includeManagement: true });
}
