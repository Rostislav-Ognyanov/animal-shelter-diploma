import LegalContent, { LEGAL_CONTENT_KEY_VALUES } from '../../models/LegalContent.js';
import { createHttpError } from '../../utils/httpError.js';
import { hasPermission } from '../shared/rolePolicies.js';

const LEGAL_CONTENT_KEY_SET = new Set(LEGAL_CONTENT_KEY_VALUES);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeText).filter(Boolean);
}

function normalizeLegalKey(legalKey) {
  const normalizedLegalKey = normalizeText(legalKey);

  if (!LEGAL_CONTENT_KEY_SET.has(normalizedLegalKey)) {
    throw createHttpError(404, 'Юридическата страница не беше намерена.');
  }

  return normalizedLegalKey;
}

function normalizeSections(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section, index) => ({
      title: normalizeText(section?.title),
      paragraphs: normalizeStringList(section?.paragraphs),
      items: normalizeStringList(section?.items),
      closing: normalizeStringList(section?.closing),
      order: Number.isFinite(Number(section?.order)) ? Number(section.order) : index,
      isVisible: section?.isVisible !== false,
    }))
    .filter((section) => section.title || section.paragraphs.length || section.items.length || section.closing.length)
    .sort((firstSection, secondSection) => firstSection.order - secondSection.order);
}

function normalizeLegalPayload(payload = {}, existingContent = null) {
  const title = normalizeText(payload.title ?? existingContent?.title);

  if (!title) {
    throw createHttpError(400, 'Попълни заглавие на юридическата страница.');
  }

  return {
    title,
    lastUpdatedLabel: normalizeText(payload.lastUpdatedLabel ?? existingContent?.lastUpdatedLabel),
    intro: normalizeStringList(payload.intro ?? existingContent?.intro),
    sections: normalizeSections(payload.sections ?? existingContent?.sections),
  };
}

function buildSnapshot(content) {
  return {
    title: content.title,
    lastUpdatedLabel: content.lastUpdatedLabel,
    intro: content.intro ?? [],
    sections: normalizeSections(content.sections ?? []),
  };
}

function assertPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'content', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function serializeLegalContent(record, { includeDraft = false } = {}) {
  if (!record) {
    return null;
  }

  const publishedSnapshot = record.publishedSnapshot ?? null;
  const publicContent = publishedSnapshot
    ? {
        title: publishedSnapshot.title,
        lastUpdatedLabel: publishedSnapshot.lastUpdatedLabel,
        intro: publishedSnapshot.intro ?? [],
        sections: normalizeSections(publishedSnapshot.sections ?? []).filter((section) => section.isVisible),
      }
    : null;

  const serializedContent = {
    id: String(record._id),
    legalKey: record.legalKey,
    status: record.status,
    version: record.version ?? 0,
    publishedAt: record.publishedAt,
    publishedBy: record.publishedBy ? String(record.publishedBy) : null,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy ? String(record.updatedBy) : null,
    content: publicContent,
  };

  if (includeDraft) {
    serializedContent.draft = buildSnapshot(record);
    serializedContent.history = (record.history ?? [])
      .map((historyItem) => ({
        version: historyItem.version,
        publishedAt: historyItem.publishedAt,
        replacedAt: historyItem.replacedAt,
        publishedBy: historyItem.publishedBy ? String(historyItem.publishedBy) : null,
        snapshot: historyItem.snapshot,
      }))
      .sort((firstItem, secondItem) => secondItem.version - firstItem.version);
  }

  return serializedContent;
}

export async function getPublishedLegalContent(legalKey) {
  const normalizedLegalKey = normalizeLegalKey(legalKey);
  const legalContent = await LegalContent.findOne({ legalKey: normalizedLegalKey }).lean();
  const serializedContent = serializeLegalContent(legalContent);

  if (!serializedContent?.content) {
    throw createHttpError(404, 'Публикуваното юридическо съдържание не беше намерено.');
  }

  return serializedContent;
}

export async function listLegalContentDrafts(currentUser) {
  assertPermission(currentUser, 'manage-legal');

  const records = await LegalContent.find({})
    .sort({ legalKey: 1, _id: 1 })
    .lean();

  return records.map((record) => serializeLegalContent(record, { includeDraft: true }));
}

export async function getLegalContentDraft(legalKey, currentUser) {
  assertPermission(currentUser, 'manage-legal');

  const normalizedLegalKey = normalizeLegalKey(legalKey);
  const legalContent = await LegalContent.findOne({ legalKey: normalizedLegalKey }).lean();

  if (!legalContent) {
    throw createHttpError(404, 'Юридическата страница не беше намерена.');
  }

  return serializeLegalContent(legalContent, { includeDraft: true });
}

export async function updateLegalContentDraft(legalKey, payload, currentUser) {
  assertPermission(currentUser, 'manage-legal');

  const normalizedLegalKey = normalizeLegalKey(legalKey);
  const existingContent = await LegalContent.findOne({ legalKey: normalizedLegalKey });
  const normalizedPayload = normalizeLegalPayload(payload, existingContent);

  const legalContent = await LegalContent.findOneAndUpdate(
    { legalKey: normalizedLegalKey },
    {
      $set: {
        ...normalizedPayload,
        status: 'draft',
        updatedBy: currentUser.id,
      },
      $setOnInsert: {
        legalKey: normalizedLegalKey,
      },
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  ).lean();

  return serializeLegalContent(legalContent, { includeDraft: true });
}

export async function publishLegalContentDraft(legalKey, currentUser) {
  assertPermission(currentUser, 'manage-legal');

  const normalizedLegalKey = normalizeLegalKey(legalKey);
  const legalContent = await LegalContent.findOne({ legalKey: normalizedLegalKey });

  if (!legalContent) {
    throw createHttpError(404, 'Юридическата страница не беше намерена.');
  }

  const now = new Date();
  const previousSnapshot = legalContent.publishedSnapshot
    ? {
        version: legalContent.version,
        snapshot: legalContent.publishedSnapshot,
        publishedAt: legalContent.publishedAt,
        replacedAt: now,
        publishedBy: legalContent.publishedBy,
      }
    : null;

  if (previousSnapshot) {
    legalContent.history.push(previousSnapshot);
  }

  legalContent.version = Number(legalContent.version ?? 0) + 1;
  legalContent.status = 'published';
  legalContent.publishedSnapshot = buildSnapshot(legalContent);
  legalContent.publishedAt = now;
  legalContent.publishedBy = currentUser.id;
  legalContent.updatedBy = currentUser.id;

  await legalContent.save();
  return serializeLegalContent(legalContent.toObject(), { includeDraft: true });
}
