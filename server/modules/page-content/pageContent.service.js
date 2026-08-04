import PageContent from '../../models/PageContent.js';
import { createHttpError } from '../../utils/httpError.js';
import { PAGE_CONTENT_KEY_SET } from './pageContent.constants.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePageKey(pageKey) {
  const normalizedPageKey = String(pageKey ?? '').trim();

  if (!PAGE_CONTENT_KEY_SET.has(normalizedPageKey)) {
    throw createHttpError(404, 'Съдържанието за тази страница не беше намерено.');
  }

  return normalizedPageKey;
}

function normalizeContentPayload(payload) {
  if (!isPlainObject(payload) || !isPlainObject(payload.content)) {
    throw createHttpError(400, 'Изпрати валидно съдържание за страницата.');
  }

  return payload.content;
}

function serializePageContent(record, pageKey) {
  if (!record) {
    return {
      pageKey,
      content: null,
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    id: String(record._id),
    pageKey: record.pageKey,
    content: record.content ?? {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy ? String(record.updatedBy) : null,
  };
}

export async function getPageContent(pageKey) {
  const normalizedPageKey = normalizePageKey(pageKey);
  const pageContent = await PageContent.findOne({ pageKey: normalizedPageKey }).lean();

  return serializePageContent(pageContent, normalizedPageKey);
}

export async function updatePageContent(pageKey, payload, currentUser) {
  const normalizedPageKey = normalizePageKey(pageKey);
  const content = normalizeContentPayload(payload);

  const pageContent = await PageContent.findOneAndUpdate(
    { pageKey: normalizedPageKey },
    {
      $set: {
        content,
        updatedBy: currentUser?.id ?? null,
      },
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  ).lean();

  return serializePageContent(pageContent, normalizedPageKey);
}
