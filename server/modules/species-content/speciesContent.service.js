import SpeciesContent from '../../models/SpeciesContent.js';
import { createHttpError } from '../../utils/httpError.js';
import { ANIMAL_SPECIES_VALUES } from '../animals/animal.constants.js';
import { hasPermission } from '../shared/rolePolicies.js';

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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function normalizeSections(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section, index) => ({
      title: normalizeText(section?.title),
      paragraphs: normalizeStringArray(section?.paragraphs),
      items: normalizeStringArray(section?.items),
      imageUrl: normalizeText(section?.imageUrl),
      imageAlt: normalizeText(section?.imageAlt),
      imagePosition: section?.imagePosition === 'left' ? 'left' : 'right',
      order: Number.isFinite(Number(section?.order)) ? Number(section.order) : index,
      isVisible: section?.isVisible !== false,
      centered: Boolean(section?.centered),
    }))
    .filter((section) => section.title || section.paragraphs.length || section.items.length);
}

function normalizeContentFields(payload = {}) {
  return {
    displayName: normalizeText(payload.displayName),
    title: normalizeText(payload.title),
    subtitle: normalizeText(payload.subtitle),
    cardImageUrl: normalizeText(payload.cardImageUrl),
    cardImageAlt: normalizeText(payload.cardImageAlt),
    heroImageUrl: normalizeText(payload.heroImageUrl),
    introduction: normalizeText(payload.introduction),
    issues: normalizeStringArray(payload.issues),
    sections: normalizeSections(payload.sections),
  };
}

function buildPublishedPayload(record) {
  const source = record.publishedSnapshot ?? record;

  return {
    id: String(record._id),
    species: record.species,
    ...normalizeContentFields(source),
    isPublished: Boolean(record.isPublished),
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
  };
}

function serializeStaffRecord(record) {
  return {
    id: String(record._id),
    species: record.species,
    draft: normalizeContentFields(record),
    published: record.publishedSnapshot ? normalizeContentFields(record.publishedSnapshot) : null,
    isPublished: Boolean(record.isPublished),
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

  const species = normalizeSpecies(speciesCandidate);
  const contentFields = normalizeContentFields(payload);

  const record = await SpeciesContent.findOneAndUpdate(
    { species },
    {
      $set: {
        ...contentFields,
        updatedBy: currentUser.id,
      },
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    }
  ).lean();

  return serializeStaffRecord(record);
}

export async function publishSpeciesContentDraft(speciesCandidate, currentUser) {
  assertPermission(currentUser, 'publish');

  const species = normalizeSpecies(speciesCandidate);
  const record = await SpeciesContent.findOne({ species });

  if (!record) {
    throw createHttpError(404, 'Няма чернова за публикуване.');
  }

  record.publishedSnapshot = normalizeContentFields(record);
  record.isPublished = true;
  record.publishedAt = new Date();
  record.publishedBy = currentUser.id;
  record.updatedBy = currentUser.id;
  await record.save();

  return serializeStaffRecord(record.toObject());
}

export async function archiveSpeciesContent(speciesCandidate, currentUser) {
  assertPermission(currentUser, 'archive');

  const species = normalizeSpecies(speciesCandidate);
  const record = await SpeciesContent.findOneAndUpdate(
    { species },
    {
      $set: {
        isPublished: false,
        updatedBy: currentUser.id,
      },
    },
    { new: true, runValidators: true }
  ).lean();

  if (!record) {
    throw createHttpError(404, 'Информацията за този вид не беше намерена.');
  }

  return serializeStaffRecord(record);
}
