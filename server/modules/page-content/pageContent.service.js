import PageContent from '../../models/PageContent.js';
import { createHttpError } from '../../utils/httpError.js';
import { isPlainObject } from '../../utils/object.js';
import { PAGE_CONTENT_KEYS } from '../../../shared/domain/pageContentConstants.js';
import { normalizePageContentByKey } from './pageContent.normalizers.js';

function normalizePageKey(pageKey) {
  const normalizedPageKey = String(pageKey ?? '').trim();

  if (!PAGE_CONTENT_KEYS.includes(normalizedPageKey)) {
    throw createHttpError(404, 'Съдържанието за тази страница не беше намерено.');
  }

  return normalizedPageKey;
}

function mergeContentPatch(currentContent, contentPatch) {
  const mergedContent = isPlainObject(currentContent) ? { ...currentContent } : {};

  Object.entries(contentPatch).forEach(([fieldName, nextValue]) => {
    const currentValue = mergedContent[fieldName];

    if (Array.isArray(nextValue)) {
      mergedContent[fieldName] = nextValue;
      return;
    }

    if (isPlainObject(nextValue) && isPlainObject(currentValue)) {
      mergedContent[fieldName] = mergeContentPatch(currentValue, nextValue);
      return;
    }

    mergedContent[fieldName] = nextValue;
  });

  return mergedContent;
}

function normalizeContentPayload(pageKey, payload, currentContent) {
  if (!isPlainObject(payload) || !isPlainObject(payload.content)) {
    throw createHttpError(400, 'Изпрати валидно съдържание за страницата.');
  }

  const mergedContent = mergeContentPatch(currentContent, payload.content);
  return normalizePageContentByKey(pageKey, mergedContent, { strict: true });
}

function serializePageContent(record, pageKey, { includeManagement = false } = {}) {
  if (!record) {
    const emptyContent = {
      pageKey,
      content: null,
    };

    if (!includeManagement) {
      return emptyContent;
    }

    return {
      ...emptyContent,
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    };
  }

  const serializedContent = {
    id: String(record._id),
    pageKey: record.pageKey,
    content: normalizePageContentByKey(record.pageKey, record.content ?? {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy ? String(record.updatedBy) : null,
  };

  if (includeManagement) {
    return serializedContent;
  }

  const { id, createdAt, updatedAt, updatedBy, ...publicContent } = serializedContent;
  return publicContent;
}

export async function getPageContent(pageKey) {
  const normalizedPageKey = normalizePageKey(pageKey);
  const pageContent = await PageContent.findOne({ pageKey: normalizedPageKey }).lean();

  return serializePageContent(pageContent, normalizedPageKey);
}

export async function updatePageContent(pageKey, payload, currentUser) {
  const normalizedPageKey = normalizePageKey(pageKey);
  const currentPageContent = await PageContent.findOne({ pageKey: normalizedPageKey })
    .select('content')
    .lean();
  const content = normalizeContentPayload(
    normalizedPageKey,
    payload,
    currentPageContent?.content ?? {}
  );

  // Page content is uniquely identified by pageKey, so the first save creates it
  // and later saves update it.
  const pageContent = await PageContent.findOneAndUpdate(
    { pageKey: normalizedPageKey },
    {
      $set: {
        content,
        updatedBy: currentUser?.id ?? null,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  ).lean();

  return serializePageContent(pageContent, normalizedPageKey, { includeManagement: true });
}
