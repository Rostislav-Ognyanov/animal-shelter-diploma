import LegalContent from '../../models/LegalContent.js';
import { createHttpError } from '../../utils/httpError.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import {
  LEGAL_CONTENT_EDITABLE_FIELDS,
  LEGAL_CONTENT_KEY_VALUES,
} from '../../../shared/domain/legalContentConstants.js';
import { hasPermission } from '../shared/rolePolicies.js';
import {
  areLegalSnapshotsEqual,
  assertLegalContentPublishable,
  createEmptyLegalContentFields,
  mergeLegalContentFields,
  normalizeLegalContentFields,
} from './legalContent.normalizers.js';

const LEGAL_CONTENT_KEY_SET = new Set(LEGAL_CONTENT_KEY_VALUES);

function normalizeLegalKey(legalKey) {
  const normalizedLegalKey = String(legalKey ?? '').trim();

  if (!LEGAL_CONTENT_KEY_SET.has(normalizedLegalKey)) {
    throw createHttpError(404, 'Юридическата страница не беше намерена.');
  }

  return normalizedLegalKey;
}

function buildSnapshot(content) {
  return normalizeLegalContentFields(content);
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

  const publishedSnapshot = record.publishedSnapshot
    ? buildSnapshot(record.publishedSnapshot)
    : null;
  const publicContent = publishedSnapshot
    ? {
        ...publishedSnapshot,
        sections: publishedSnapshot.sections.filter((section) => section.isVisible),
      }
    : null;

  if (!includeDraft) {
    return {
      legalKey: record.legalKey,
      content: publicContent,
    };
  }

  const draft = buildSnapshot(record);

  return {
    id: String(record._id),
    legalKey: record.legalKey,
    status: record.status,
    version: record.version ?? 0,
    hasUnpublishedChanges: publishedSnapshot
      ? !areLegalSnapshotsEqual(draft, publishedSnapshot)
      : true,
    publishedAt: record.publishedAt,
    publishedBy: record.publishedBy ? String(record.publishedBy) : null,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy ? String(record.updatedBy) : null,
    content: publicContent,
    draft,
    history: (record.history ?? [])
      .map((historyItem) => ({
        version: historyItem.version,
        publishedAt: historyItem.publishedAt,
        replacedAt: historyItem.replacedAt,
        publishedBy: historyItem.publishedBy ? String(historyItem.publishedBy) : null,
        snapshot: buildSnapshot(historyItem.snapshot),
      }))
      .sort((firstItem, secondItem) => secondItem.version - firstItem.version),
  };
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
  assertBodyObject(payload);
  assertAllowedFields(payload, LEGAL_CONTENT_EDITABLE_FIELDS);

  const normalizedLegalKey = normalizeLegalKey(legalKey);
  const existingContent = await LegalContent.findOne({ legalKey: normalizedLegalKey }).lean();
  const currentContent = existingContent ?? createEmptyLegalContentFields();
  const normalizedPayload = normalizeLegalContentFields(
    mergeLegalContentFields(currentContent, payload)
  );
  const publishedSnapshot = existingContent?.publishedSnapshot
    ? buildSnapshot(existingContent.publishedSnapshot)
    : null;
  const hasUnpublishedChanges = publishedSnapshot
    ? !areLegalSnapshotsEqual(normalizedPayload, publishedSnapshot)
    : true;

  const legalContent = await LegalContent.findOneAndUpdate(
    { legalKey: normalizedLegalKey },
    {
      $set: {
        ...normalizedPayload,
        status: hasUnpublishedChanges ? 'draft' : 'published',
        updatedBy: currentUser.id,
      },
      $setOnInsert: {
        legalKey: normalizedLegalKey,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  ).lean();

  return serializeLegalContent(legalContent, { includeDraft: true });
}

export async function publishLegalContentDraft(legalKey, payload, currentUser) {
  assertPermission(currentUser, 'manage-legal');
  assertBodyObject(payload ?? {}, { allowEmpty: true });
  assertAllowedFields(payload ?? {}, []);

  const normalizedLegalKey = normalizeLegalKey(legalKey);
  const legalContent = await LegalContent.findOne({ legalKey: normalizedLegalKey });

  if (!legalContent) {
    throw createHttpError(404, 'Юридическата страница не беше намерена.');
  }

  const record = legalContent.toObject();
  const draftSnapshot = buildSnapshot(record);
  const publishedSnapshot = record.publishedSnapshot
    ? buildSnapshot(record.publishedSnapshot)
    : null;

  assertLegalContentPublishable(draftSnapshot);

  if (areLegalSnapshotsEqual(draftSnapshot, publishedSnapshot)) {
    throw createHttpError(409, 'Няма непубликувани промени.');
  }

  // Public reads stay on the published snapshot while draft edits continue; replaced versions move to history.
  const now = new Date();
  const previousSnapshot = publishedSnapshot
    ? {
        version: legalContent.version,
        snapshot: publishedSnapshot,
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
  legalContent.publishedSnapshot = draftSnapshot;
  legalContent.publishedAt = now;
  legalContent.publishedBy = currentUser.id;
  legalContent.updatedBy = currentUser.id;

  await legalContent.save();
  return serializeLegalContent(legalContent.toObject(), { includeDraft: true });
}
