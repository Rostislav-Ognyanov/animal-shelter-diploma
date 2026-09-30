import SpeciesContent from '../../models/SpeciesContent.js';
import { createHttpError } from '../../utils/httpError.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { SPECIES_CONTENT_EDITABLE_FIELDS } from '../../../shared/domain/speciesContentConstants.js';
import { ANIMAL_SPECIES_VALUES } from '../animals/animal.constants.js';
import { notifyUnreadUsersByRole } from '../notifications/notifications.service.js';
import { hasPermission } from '../shared/rolePolicies.js';
import {
  assertSpeciesContentPublishable,
  createEmptySpeciesContentFields,
  mergeSpeciesContentFields,
  normalizeSpeciesContentFields,
} from './speciesContent.normalizers.js';

const SPECIES_SET = new Set(ANIMAL_SPECIES_VALUES);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeSpecies(value) {
  const species = normalizeText(value).toLowerCase();

  if (!SPECIES_SET.has(species)) {
    throw createHttpError(404, 'Информацията за този вид не беше намерена.');
  }

  return species;
}

function buildPublishedPayload(record) {
  const source = record.publishedSnapshot ?? record;

  return {
    id: String(record._id),
    species: record.species,
    ...normalizeSpeciesContentFields(source),
    isPublished: Boolean(record.isPublished),
    publishedAt: record.publishedAt,
    updatedAt: record.publishedAt,
  };
}

function serializeStaffRecord(record) {
  const draft = normalizeSpeciesContentFields(record);
  const published = record.publishedSnapshot
    ? normalizeSpeciesContentFields(record.publishedSnapshot)
    : null;

  return {
    id: String(record._id),
    species: record.species,
    draft,
    published,
    isPublished: Boolean(record.isPublished),
    hasUnpublishedChanges: published ? JSON.stringify(draft) !== JSON.stringify(published) : true,
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
    updatedBy: record.updatedBy ? String(record.updatedBy) : null,
    publishedBy: record.publishedBy ? String(record.publishedBy) : null,
  };
}

function assertPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'speciesContent', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

export async function listPublishedSpeciesContent() {
  const records = await SpeciesContent.find({ isPublished: true })
    .sort({ species: 1, _id: 1 })
    .lean();

  return records.map(buildPublishedPayload);
}

export async function getPublishedSpeciesContent(speciesCandidate) {
  const species = normalizeSpecies(speciesCandidate);
  const record = await SpeciesContent.findOne({ species, isPublished: true }).lean();

  if (!record) {
    throw createHttpError(404, 'Информацията за този вид все още не е публикувана.');
  }

  return buildPublishedPayload(record);
}

export async function listSpeciesContentDrafts(currentUser) {
  assertPermission(currentUser, 'view-draft');

  const records = await SpeciesContent.find({}).sort({ species: 1, _id: 1 }).lean();
  return records.map(serializeStaffRecord);
}

export async function getSpeciesContentDraft(speciesCandidate, currentUser) {
  assertPermission(currentUser, 'view-draft');

  const species = normalizeSpecies(speciesCandidate);
  const record = await SpeciesContent.findOne({ species }).lean();

  if (!record) {
    return {
      species,
      draft: null,
      published: null,
      isPublished: false,
      hasUnpublishedChanges: false,
      publishedAt: null,
      updatedAt: null,
      createdAt: null,
      updatedBy: null,
      publishedBy: null,
    };
  }

  return serializeStaffRecord(record);
}

export async function updateSpeciesContentDraft(speciesCandidate, payload, currentUser) {
  assertPermission(currentUser, 'update');
  assertBodyObject(payload);
  assertAllowedFields(payload, SPECIES_CONTENT_EDITABLE_FIELDS);

  const species = normalizeSpecies(speciesCandidate);
  const existingRecord = await SpeciesContent.findOne({ species }).lean();
  const currentContent = existingRecord ?? createEmptySpeciesContentFields();
  const contentFields = normalizeSpeciesContentFields(
    mergeSpeciesContentFields(currentContent, payload),
    { strict: true }
  );

  const record = await SpeciesContent.findOneAndUpdate(
    { species },
    {
      $set: {
        ...contentFields,
        updatedBy: currentUser.id,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  ).lean();

  if (currentUser.role === 'employee') {
    const displayName = contentFields.displayName || species;

    try {
      await notifyUnreadUsersByRole(
        ['admin'],
        {
          type: 'species-content-draft-updated',
          title: `Нова чернова за вида „${displayName}“`,
          message: `Информацията за вида „${displayName}“ има чернова за преглед и публикуване.`,
          resourceId: species,
          dedupeKey: `species-content:${species}`,
        },
        {
          excludeUserIds: [currentUser.id],
        }
      );
    } catch (error) {
      console.error('Неуспешно изпращане на известие за чернова на вид:', error);
    }
  }

  return serializeStaffRecord(record);
}

export async function publishSpeciesContentDraft(speciesCandidate, currentUser) {
  assertPermission(currentUser, 'publish');

  const species = normalizeSpecies(speciesCandidate);
  const record = await SpeciesContent.findOne({ species });

  if (!record) {
    throw createHttpError(404, 'Няма чернова за публикуване.');
  }

  // Publishing copies the current draft into a public snapshot;
  // later draft edits stay private until republished.
  const publishedSnapshot = normalizeSpeciesContentFields(record.toObject(), { strict: true });
  assertSpeciesContentPublishable(publishedSnapshot);

  record.publishedSnapshot = publishedSnapshot;
  record.isPublished = true;
  record.publishedAt = new Date();
  record.publishedBy = currentUser.id;
  record.updatedBy = currentUser.id;
  await record.save();

  return serializeStaffRecord(record.toObject());
}

export async function archiveSpeciesContent(speciesCandidate, currentUser) {
  assertPermission(currentUser, 'archive');

  // Archiving hides the species content without deleting the draft or published snapshot.
  const species = normalizeSpecies(speciesCandidate);
  const record = await SpeciesContent.findOneAndUpdate(
    { species },
    {
      $set: {
        isPublished: false,
        updatedBy: currentUser.id,
      },
    },
    { returnDocument: 'after', runValidators: true }
  ).lean();

  if (!record) {
    throw createHttpError(404, 'Информацията за този вид не беше намерена.');
  }

  return serializeStaffRecord(record);
}
