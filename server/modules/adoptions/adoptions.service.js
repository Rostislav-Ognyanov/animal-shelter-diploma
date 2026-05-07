import crypto from 'node:crypto';

import mongoose from 'mongoose';

import { isAnimalsMockFallbackEnabled, isDatabaseConnected } from '../../config/db.js';
import AdoptionRequest from '../../models/AdoptionRequest.js';
import Animal from '../../models/Animal.js';
import { createHttpError } from '../../utils/httpError.js';
import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { saveJsonFile } from '../../utils/saveJsonFile.js';
import { ANIMAL_ID_SLUG_PATTERN } from '../animals/animal.constants.js';
import { getAnimalById, updateAnimalStatus } from '../animals/animals.service.js';
import {
  ADOPTION_REQUEST_STATUS_VALUES,
  getAllowedAdoptionRequestActions,
  hasPermission,
  normalizeRole,
} from '../shared/rolePolicies.js';

const ADOPTIONS_DATA_PATH = 'data/adoption-requests.json';
const ACTIVE_ADOPTION_REQUEST_STATUSES = ['pending', 'under-review', 'approved'];
const STAFF_ROLES = new Set(['employee', 'admin']);
const ADOPTION_REQUEST_ID_PATTERN =
  /^[0-9a-f]{24}$|^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE_PATTERN = /^[0-9+\s().-]{6,32}$/;
const RESERVED_ANIMAL_ADOPTION_STATUSES = ['under-review', 'approved'];
const ADOPTION_REQUEST_STATUS_TRANSITIONS = {
  pending: ['under-review', 'approved', 'rejected', 'cancelled'],
  'under-review': ['approved', 'rejected', 'cancelled'],
  approved: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLookupText(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeDateOutput(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function serializeId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    if (value._id) {
      return String(value._id);
    }

    if (value.id) {
      return String(value.id);
    }
  }

  return String(value);
}

function assertBodyObject(payload) {
  if (!isPlainObject(payload)) {
    throw createHttpError(400, 'Тялото на заявката трябва да бъде JSON обект.');
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'Тялото на заявката не може да бъде празно.');
  }
}

function assertAllowedFields(payload, allowedFields) {
  const allowedFieldSet = new Set(allowedFields);
  const invalidFields = Object.keys(payload).filter((fieldName) => !allowedFieldSet.has(fieldName));

  if (invalidFields.length > 0) {
    throw createHttpError(400, 'Заявката съдържа неподдържани полета.', {
      invalidFields,
      allowedFields,
    });
  }
}

function assertAuthenticatedUser(currentUser) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }
}

function assertPermission(currentUser, action) {
  assertAuthenticatedUser(currentUser);

  if (!hasPermission(currentUser.role, 'adoptions', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function assertClientCanCreate(currentUser) {
  assertPermission(currentUser, 'create-own-request');

  if (normalizeRole(currentUser.role) !== 'client') {
    throw createHttpError(403, 'Само клиент може да подаде заявка за осиновяване.');
  }
}

function assertStaffCanManage(currentUser) {
  assertAuthenticatedUser(currentUser);

  if (!STAFF_ROLES.has(normalizeRole(currentUser.role))) {
    throw createHttpError(403, 'Само служител или администратор може да управлява заявки.');
  }
}

function assertValidAnimalId(animalId) {
  const normalizedAnimalId = normalizeLookupText(animalId);

  if (!normalizedAnimalId) {
    throw createHttpError(400, 'Полето "animalId" е задължително.');
  }

  if (
    !ANIMAL_ID_SLUG_PATTERN.test(normalizedAnimalId) &&
    !mongoose.isValidObjectId(normalizedAnimalId)
  ) {
    throw createHttpError(400, 'Идентификаторът на животното е в невалиден формат.');
  }

  return normalizedAnimalId;
}

function assertValidRequestId(requestId) {
  const normalizedRequestId = normalizeText(requestId);

  if (!normalizedRequestId) {
    throw createHttpError(400, 'Липсва идентификатор на заявката.');
  }

  if (!ADOPTION_REQUEST_ID_PATTERN.test(normalizedRequestId)) {
    throw createHttpError(400, 'Идентификаторът на заявката е в невалиден формат.');
  }

  return normalizedRequestId;
}

function buildAnimalLookupQuery(animalId) {
  const normalizedAnimalId = assertValidAnimalId(animalId);
  const lookupQuery = [{ slug: normalizedAnimalId }];

  if (mongoose.isValidObjectId(normalizedAnimalId)) {
    lookupQuery.push({ _id: normalizedAnimalId });
  }

  return {
    normalizedAnimalId,
    query: { $or: lookupQuery },
  };
}

function normalizeStatus(value, fieldName = 'status') {
  const status = normalizeLookupText(value);

  if (!ADOPTION_REQUEST_STATUS_VALUES.includes(status)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалидна стойност.`, {
      allowedStatuses: ADOPTION_REQUEST_STATUS_VALUES,
    });
  }

  return status;
}

function normalizeOptionalStatus(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return normalizeStatus(value, 'status');
}

function assertAllowedStatusTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus || currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = ADOPTION_REQUEST_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (!allowedTransitions.includes(nextStatus)) {
    throw createHttpError(
      409,
      `Преходът от статус "${currentStatus}" към "${nextStatus}" не е разрешен.`,
      {
        currentStatus,
        requestedStatus: nextStatus,
        allowedTransitions,
      }
    );
  }
}

function normalizeCreatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['animalId', 'animal', 'motivation', 'message', 'contactPhone']);

  const animalId = assertValidAnimalId(payload.animalId ?? payload.animal);
  const motivation = normalizeText(payload.motivation ?? payload.message);
  const contactPhone = normalizeText(payload.contactPhone);

  if (!motivation) {
    throw createHttpError(400, 'Полето "motivation" е задължително.');
  }

  if (!contactPhone) {
    throw createHttpError(400, 'Полето "contactPhone" е задължително.');
  }

  if (!PHONE_PATTERN.test(contactPhone)) {
    throw createHttpError(400, 'Полето "contactPhone" съдържа невалиден телефонен номер.');
  }

  return {
    animalId,
    motivation,
    contactPhone,
  };
}

function normalizeStatusUpdatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['status', 'internalNote', 'internalNotes', 'note']);

  const status = normalizeStatus(payload.status, 'status');
  const internalNote = normalizeInternalNote(payload.internalNote ?? payload.internalNotes ?? payload.note);

  return {
    status,
    internalNote,
  };
}

function normalizeCancelPayload(payload) {
  if (payload === undefined || payload === null || Object.keys(payload).length === 0) {
    return {
      reason: '',
    };
  }

  if (!isPlainObject(payload)) {
    throw createHttpError(400, 'Тялото на заявката трябва да бъде JSON обект.');
  }

  assertAllowedFields(payload, ['reason', 'message']);

  return {
    reason: normalizeText(payload.reason ?? payload.message),
  };
}

function normalizeInternalNote(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    const normalizedNotes = value.map((entry) => normalizeText(entry)).filter(Boolean);
    return normalizedNotes.length > 0 ? normalizedNotes.join('\n') : null;
  }

  const note = normalizeText(value);
  return note || null;
}

function buildInternalNote(text, currentUser) {
  if (!text) {
    return null;
  }

  const authorName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim();

  return {
    text,
    author: mongoose.isValidObjectId(currentUser.id) ? currentUser.id : null,
    authorId: currentUser.id,
    authorName: authorName || currentUser.username || '',
    createdAt: new Date().toISOString(),
  };
}

function canUseMockFallback() {
  return !isDatabaseConnected() && isAnimalsMockFallbackEnabled();
}

function assertAdoptionsDataSourceAvailable() {
  if (isDatabaseConnected() || canUseMockFallback()) {
    return;
  }

  throw createHttpError(
    503,
    'Модулът за заявки за осиновяване не е достъпен, защото няма активна връзка с MongoDB и mock fallback режимът е изключен.'
  );
}

async function readMockAdoptionRequests() {
  assertAdoptionsDataSourceAvailable();
  return loadJsonFile(ADOPTIONS_DATA_PATH);
}

async function writeMockAdoptionRequests(adoptionRequests) {
  assertAdoptionsDataSourceAvailable();
  return saveJsonFile(ADOPTIONS_DATA_PATH, adoptionRequests);
}

function getPrimaryImageUrl(animal) {
  if (Array.isArray(animal.imageUrls) && animal.imageUrls.length > 0) {
    return animal.imageUrls[0];
  }

  return animal.imageUrl ?? animal.image ?? '';
}

function serializeUserSnapshot(user) {
  if (!user || typeof user !== 'object') {
    return {
      id: serializeId(user),
    };
  }

  return {
    id: serializeId(user),
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? '',
    email: user.email ?? '',
    role: user.role ?? '',
  };
}

function serializeAnimalSnapshot(animal) {
  if (!animal || typeof animal !== 'object') {
    return {
      id: serializeId(animal),
    };
  }

  const slug = animal.slug ?? '';
  const id = slug || animal.id || serializeId(animal);

  return {
    id: String(id),
    mongoId: animal._id ? String(animal._id) : animal.mongoId,
    slug,
    name: animal.name ?? '',
    displayName: animal.displayName ?? animal.name ?? '',
    species: animal.species ?? animal.type ?? '',
    breed: animal.breed ?? '',
    status: animal.status ?? '',
    imageUrl: getPrimaryImageUrl(animal),
  };
}

function serializeInternalNotes(internalNotes = []) {
  if (!Array.isArray(internalNotes)) {
    return [];
  }

  return internalNotes.map((note) => ({
    text: note.text ?? '',
    authorId: serializeId(note.author ?? note.authorId),
    authorName: note.authorName ?? '',
    createdAt: normalizeDateOutput(note.createdAt),
  }));
}

function canViewerSeeInternalNotes(currentUser) {
  return STAFF_ROLES.has(normalizeRole(currentUser?.role));
}

function serializeAdoptionRequest(adoptionRequest, currentUser = null) {
  const user = serializeUserSnapshot(adoptionRequest.user ?? adoptionRequest.userId);
  const animal = serializeAnimalSnapshot(adoptionRequest.animal ?? adoptionRequest.animalId);
  const motivation = adoptionRequest.motivation ?? adoptionRequest.message ?? '';

  return {
    id: adoptionRequest.id ?? serializeId(adoptionRequest),
    userId: user.id,
    user,
    animalId: animal.id,
    animal,
    status: adoptionRequest.status,
    motivation,
    message: motivation,
    contactPhone: adoptionRequest.contactPhone ?? '',
    internalNotes: canViewerSeeInternalNotes(currentUser)
      ? serializeInternalNotes(adoptionRequest.internalNotes)
      : [],
    createdAt: normalizeDateOutput(adoptionRequest.createdAt),
    updatedAt: normalizeDateOutput(adoptionRequest.updatedAt),
  };
}

function buildRequestQuery(filters = {}) {
  const status = normalizeOptionalStatus(filters.status);
  return status ? { status } : {};
}

function sortRequestsByNewest(requests) {
  return [...requests].sort((leftRequest, rightRequest) => {
    const leftCreatedAt = new Date(leftRequest.createdAt ?? 0).getTime();
    const rightCreatedAt = new Date(rightRequest.createdAt ?? 0).getTime();
    return rightCreatedAt - leftCreatedAt;
  });
}

function getRequestOwnerId(adoptionRequest) {
  return serializeId(adoptionRequest.user ?? adoptionRequest.userId);
}

function isOwnRequest(adoptionRequest, currentUser) {
  return getRequestOwnerId(adoptionRequest) === currentUser?.id;
}

function assertCanViewRequest(adoptionRequest, currentUser) {
  assertAuthenticatedUser(currentUser);

  if (STAFF_ROLES.has(normalizeRole(currentUser.role))) {
    return;
  }

  if (hasPermission(currentUser.role, 'adoptions', 'detail-own') && isOwnRequest(adoptionRequest, currentUser)) {
    return;
  }

  throw createHttpError(403, 'Нямаш достъп до тази заявка за осиновяване.');
}

function getRequestAnimalLookupId(adoptionRequest) {
  const animal = serializeAnimalSnapshot(adoptionRequest.animal ?? adoptionRequest.animalId);
  return animal.slug || animal.id || serializeId(adoptionRequest.animal ?? adoptionRequest.animalId);
}

function getRequestAnimalStorageId(adoptionRequest) {
  return serializeId(adoptionRequest.animal ?? adoptionRequest.animalId);
}

async function getCurrentAnimalForRequest(adoptionRequest) {
  const animalId = getRequestAnimalLookupId(adoptionRequest);

  if (!animalId) {
    throw createHttpError(409, 'Заявката не е свързана с валидно животно.');
  }

  const animal = await getAnimalById(animalId);

  if (!animal) {
    throw createHttpError(404, 'Свързаното животно не беше намерено.');
  }

  return animal;
}

async function hasCompetingReservedRequest(adoptionRequest) {
  const currentRequestId = serializeId(adoptionRequest);

  if (isDatabaseConnected()) {
    const animalStorageId = getRequestAnimalStorageId(adoptionRequest);

    if (!mongoose.isValidObjectId(animalStorageId)) {
      return false;
    }

    const competingRequest = await AdoptionRequest.findOne({
      _id: { $ne: currentRequestId },
      animal: animalStorageId,
      status: { $in: RESERVED_ANIMAL_ADOPTION_STATUSES },
    }).lean();

    return Boolean(competingRequest);
  }

  const animalLookupId = getRequestAnimalLookupId(adoptionRequest);
  const adoptionRequests = await readMockAdoptionRequests();

  return adoptionRequests.some((entry) => {
    if (entry.id === currentRequestId) {
      return false;
    }

    return (
      getRequestAnimalLookupId(entry) === animalLookupId &&
      RESERVED_ANIMAL_ADOPTION_STATUSES.includes(entry.status)
    );
  });
}

async function assertNoCompetingReservedRequest(adoptionRequest) {
  const hasCompetingRequest = await hasCompetingReservedRequest(adoptionRequest);

  if (hasCompetingRequest) {
    throw createHttpError(
      409,
      'Вече има друга активна служебна заявка, която резервира това животно.'
    );
  }
}

async function synchronizeAnimalForAdoptionStatus(adoptionRequest, nextStatus) {
  const currentStatus = adoptionRequest.status;

  if (!nextStatus || currentStatus === nextStatus) {
    return null;
  }

  const animalId = getRequestAnimalLookupId(adoptionRequest);

  if (RESERVED_ANIMAL_ADOPTION_STATUSES.includes(nextStatus)) {
    await assertNoCompetingReservedRequest(adoptionRequest);
    const animal = await getCurrentAnimalForRequest(adoptionRequest);

    if (animal.status === 'reserved') {
      return animal;
    }

    if (animal.status !== 'available') {
      throw createHttpError(
        409,
        'Животното трябва да бъде със статус "available", за да бъде резервирано за заявка.'
      );
    }

    return updateAnimalStatus(animalId, { status: 'reserved' });
  }

  if (nextStatus === 'completed') {
    const animal = await getCurrentAnimalForRequest(adoptionRequest);

    if (animal.status === 'adopted') {
      return animal;
    }

    if (animal.status !== 'reserved') {
      throw createHttpError(
        409,
        'Животното трябва да бъде със статус "reserved", преди осиновяването да бъде завършено.'
      );
    }

    return updateAnimalStatus(animalId, { status: 'adopted' });
  }

  if (
    ['rejected', 'cancelled'].includes(nextStatus) &&
    RESERVED_ANIMAL_ADOPTION_STATUSES.includes(currentStatus)
  ) {
    const animal = await getCurrentAnimalForRequest(adoptionRequest);

    if (animal.status !== 'reserved') {
      return animal;
    }

    const hasCompetingRequest = await hasCompetingReservedRequest(adoptionRequest);

    if (hasCompetingRequest) {
      return animal;
    }

    return updateAnimalStatus(animalId, { status: 'available' });
  }

  return null;
}

async function findAnimalForRequest(animalId) {
  const normalizedAnimalId = assertValidAnimalId(animalId);

  if (isDatabaseConnected()) {
    const { query } = buildAnimalLookupQuery(normalizedAnimalId);
    const animal = await Animal.findOne(query).lean();

    if (!animal) {
      return null;
    }

    return {
      storageId: animal._id,
      snapshot: serializeAnimalSnapshot(animal),
      record: animal,
    };
  }

  const animal = await getAnimalById(normalizedAnimalId);

  if (!animal) {
    return null;
  }

  return {
    storageId: animal.id,
    snapshot: serializeAnimalSnapshot(animal),
    record: animal,
  };
}

async function assertNoActiveDuplicate(currentUser, animalContext) {
  if (isDatabaseConnected()) {
    const existingRequest = await AdoptionRequest.findOne({
      user: currentUser.id,
      animal: animalContext.storageId,
      status: { $in: ACTIVE_ADOPTION_REQUEST_STATUSES },
    }).lean();

    if (existingRequest) {
      throw createHttpError(
        409,
        'Вече имаш активна заявка за осиновяване на това животно.'
      );
    }

    return;
  }

  const adoptionRequests = await readMockAdoptionRequests();
  const existingRequest = adoptionRequests.find((entry) => {
    const requestUserId = getRequestOwnerId(entry);
    const requestAnimalId = serializeAnimalSnapshot(entry.animal ?? entry.animalId).id;
    return (
      requestUserId === currentUser.id &&
      requestAnimalId === animalContext.snapshot.id &&
      ACTIVE_ADOPTION_REQUEST_STATUSES.includes(entry.status)
    );
  });

  if (existingRequest) {
    throw createHttpError(409, 'Вече имаш активна заявка за осиновяване на това животно.');
  }
}

async function findAdoptionRequestById(requestId) {
  const normalizedRequestId = assertValidRequestId(requestId);

  if (isDatabaseConnected()) {
    if (!mongoose.isValidObjectId(normalizedRequestId)) {
      return null;
    }

    return AdoptionRequest.findById(normalizedRequestId)
      .populate('user', 'firstName lastName username email role')
      .populate('animal', 'slug name displayName species breed status imageUrls')
      .lean();
  }

  const adoptionRequests = await readMockAdoptionRequests();
  return adoptionRequests.find((entry) => entry.id === normalizedRequestId) ?? null;
}

async function getPopulatedAdoptionRequest(requestId) {
  if (!isDatabaseConnected()) {
    return findAdoptionRequestById(requestId);
  }

  return AdoptionRequest.findById(requestId)
    .populate('user', 'firstName lastName username email role')
    .populate('animal', 'slug name displayName species breed status imageUrls')
    .lean();
}

export function getAdoptionRequestModulePolicy(roleCandidate) {
  return {
    resource: 'adoptions',
    allowedActions: getAllowedAdoptionRequestActions(roleCandidate),
    statuses: ADOPTION_REQUEST_STATUS_VALUES,
    activeStatuses: ACTIVE_ADOPTION_REQUEST_STATUSES,
  };
}

export async function createAdoptionRequest(payload, currentUser) {
  assertClientCanCreate(currentUser);
  const normalizedPayload = normalizeCreatePayload(payload);
  const animalContext = await findAnimalForRequest(normalizedPayload.animalId);

  if (!animalContext) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  if (animalContext.snapshot.status !== 'available' || animalContext.record.isActive === false) {
    throw createHttpError(
      409,
      'Заявка за осиновяване може да се подаде само за животно със статус "available".'
    );
  }

  await assertNoActiveDuplicate(currentUser, animalContext);

  if (isDatabaseConnected()) {
    const createdRequest = await AdoptionRequest.create({
      user: currentUser.id,
      animal: animalContext.storageId,
      status: 'pending',
      motivation: normalizedPayload.motivation,
      contactPhone: normalizedPayload.contactPhone,
    });
    const populatedRequest = await getPopulatedAdoptionRequest(createdRequest._id);

    return serializeAdoptionRequest(populatedRequest, currentUser);
  }

  const adoptionRequests = await readMockAdoptionRequests();
  const now = new Date().toISOString();
  const adoptionRequest = {
    id: crypto.randomUUID(),
    userId: currentUser.id,
    user: serializeUserSnapshot(currentUser),
    animalId: animalContext.snapshot.id,
    animal: animalContext.snapshot,
    status: 'pending',
    motivation: normalizedPayload.motivation,
    contactPhone: normalizedPayload.contactPhone,
    internalNotes: [],
    createdAt: now,
    updatedAt: now,
  };

  adoptionRequests.push(adoptionRequest);
  await writeMockAdoptionRequests(adoptionRequests);

  return serializeAdoptionRequest(adoptionRequest, currentUser);
}

export async function getOwnAdoptionRequestCollection(currentUser, filters = {}) {
  assertPermission(currentUser, 'list-own');
  const query = buildRequestQuery(filters);

  if (isDatabaseConnected()) {
    const requests = await AdoptionRequest.find({
      user: currentUser.id,
      ...query,
    })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName username email role')
      .populate('animal', 'slug name displayName species breed status imageUrls')
      .lean();

    return requests.map((entry) => serializeAdoptionRequest(entry, currentUser));
  }

  const adoptionRequests = await readMockAdoptionRequests();
  return sortRequestsByNewest(adoptionRequests)
    .filter((entry) => getRequestOwnerId(entry) === currentUser.id)
    .filter((entry) => !query.status || entry.status === query.status)
    .map((entry) => serializeAdoptionRequest(entry, currentUser));
}

export async function getAllAdoptionRequestCollection(currentUser, filters = {}) {
  assertPermission(currentUser, 'view-all');
  assertStaffCanManage(currentUser);
  const query = buildRequestQuery(filters);

  if (isDatabaseConnected()) {
    const requests = await AdoptionRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName username email role')
      .populate('animal', 'slug name displayName species breed status imageUrls')
      .lean();

    return requests.map((entry) => serializeAdoptionRequest(entry, currentUser));
  }

  const adoptionRequests = await readMockAdoptionRequests();
  return sortRequestsByNewest(adoptionRequests)
    .filter((entry) => !query.status || entry.status === query.status)
    .map((entry) => serializeAdoptionRequest(entry, currentUser));
}

export async function getAdoptionRequestById(requestId, currentUser) {
  const adoptionRequest = await findAdoptionRequestById(requestId);

  if (!adoptionRequest) {
    throw createHttpError(404, 'Заявката за осиновяване не беше намерена.');
  }

  assertCanViewRequest(adoptionRequest, currentUser);
  return serializeAdoptionRequest(adoptionRequest, currentUser);
}

export async function updateAdoptionRequestStatus(requestId, payload, currentUser) {
  assertPermission(currentUser, 'update-status');
  assertStaffCanManage(currentUser);
  const normalizedRequestId = assertValidRequestId(requestId);
  const normalizedPayload = normalizeStatusUpdatePayload(payload);
  const existingRequest = await findAdoptionRequestById(normalizedRequestId);

  if (!existingRequest) {
    throw createHttpError(404, 'Заявката за осиновяване не беше намерена.');
  }

  assertAllowedStatusTransition(existingRequest.status, normalizedPayload.status);
  const internalNote = buildInternalNote(normalizedPayload.internalNote, currentUser);
  const synchronizedAnimal = await synchronizeAnimalForAdoptionStatus(
    existingRequest,
    normalizedPayload.status
  );

  if (isDatabaseConnected()) {
    const updateOperation = {
      $set: {
        status: normalizedPayload.status,
      },
    };

    if (internalNote) {
      updateOperation.$push = {
        internalNotes: internalNote,
      };
    }

    const updatedRequest = await AdoptionRequest.findByIdAndUpdate(
      normalizedRequestId,
      updateOperation,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('user', 'firstName lastName username email role')
      .populate('animal', 'slug name displayName species breed status imageUrls')
      .lean();

    return serializeAdoptionRequest(updatedRequest, currentUser);
  }

  const adoptionRequests = await readMockAdoptionRequests();
  const requestIndex = adoptionRequests.findIndex((entry) => entry.id === normalizedRequestId);

  if (requestIndex === -1) {
    throw createHttpError(404, 'Заявката за осиновяване не беше намерена.');
  }

  const updatedRequest = {
    ...adoptionRequests[requestIndex],
    animal: synchronizedAnimal
      ? serializeAnimalSnapshot(synchronizedAnimal)
      : adoptionRequests[requestIndex].animal,
    animalId: synchronizedAnimal
      ? serializeAnimalSnapshot(synchronizedAnimal).id
      : adoptionRequests[requestIndex].animalId,
    status: normalizedPayload.status,
    internalNotes: internalNote
      ? [...(adoptionRequests[requestIndex].internalNotes ?? []), internalNote]
      : adoptionRequests[requestIndex].internalNotes ?? [],
    updatedAt: new Date().toISOString(),
  };

  adoptionRequests[requestIndex] = updatedRequest;
  await writeMockAdoptionRequests(adoptionRequests);

  return serializeAdoptionRequest(updatedRequest, currentUser);
}

export async function cancelAdoptionRequest(requestId, payload, currentUser) {
  assertPermission(currentUser, 'cancel-own-pending');
  const normalizedRequestId = assertValidRequestId(requestId);
  normalizeCancelPayload(payload ?? {});
  const existingRequest = await findAdoptionRequestById(normalizedRequestId);

  if (!existingRequest) {
    throw createHttpError(404, 'Заявката за осиновяване не беше намерена.');
  }

  if (!isOwnRequest(existingRequest, currentUser)) {
    throw createHttpError(403, 'Можеш да отменяш само свои заявки.');
  }

  if (existingRequest.status !== 'pending') {
    throw createHttpError(409, 'Може да бъде отменена само заявка със статус "pending".');
  }

  if (isDatabaseConnected()) {
    const updatedRequest = await AdoptionRequest.findByIdAndUpdate(
      normalizedRequestId,
      {
        status: 'cancelled',
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('user', 'firstName lastName username email role')
      .populate('animal', 'slug name displayName species breed status imageUrls')
      .lean();

    return serializeAdoptionRequest(updatedRequest, currentUser);
  }

  const adoptionRequests = await readMockAdoptionRequests();
  const requestIndex = adoptionRequests.findIndex((entry) => entry.id === normalizedRequestId);

  if (requestIndex === -1) {
    throw createHttpError(404, 'Заявката за осиновяване не беше намерена.');
  }

  const updatedRequest = {
    ...adoptionRequests[requestIndex],
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  };

  adoptionRequests[requestIndex] = updatedRequest;
  await writeMockAdoptionRequests(adoptionRequests);

  return serializeAdoptionRequest(updatedRequest, currentUser);
}
