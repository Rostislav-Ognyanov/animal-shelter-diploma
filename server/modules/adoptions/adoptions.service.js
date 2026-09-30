import mongoose from 'mongoose';

import AdoptionRequest from '../../models/AdoptionRequest.js';
import Animal from '../../models/Animal.js';
import User from '../../models/User.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { readWorkflowCollectionPage } from '../../utils/workflowList.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { normalizeDateOutput, serializeId } from '../../utils/serialization.js';
import { isPlainObject } from '../../utils/object.js';
import {
  ADOPTION_ANIMAL_ALLERGY_VALUES,
  ADOPTION_ANIMAL_LIVING_PLACE_VALUES,
  ADOPTION_HOUSING_TYPE_VALUES,
  ADOPTION_MAX_OTHER_PETS,
  ADOPTION_OTHER_PET_CARE_STATUS_VALUES,
  ADOPTION_OTHER_PET_SEX_VALUES,
  ADOPTION_OTHER_PET_SPECIES_VALUES,
  ADOPTION_STATUS_LABELS,
  ADOPTION_STATUS_TRANSITIONS,
  ADOPTION_STATUS_VALUES,
  ADOPTION_TEXT_LIMITS,
  ADOPTION_TRANSPORT_VALUES,
  ADOPTION_YARD_SECURITY_VALUES,
  isValidAdoptionPhone,
} from '../../../shared/domain/adoptionConstants.js';
import { PROTECTED_CARE_SPECIES_VALUES } from '../../../shared/domain/animalConstants.js';
import { ANIMAL_ID_SLUG_PATTERN } from '../animals/animal.constants.js';
import { updateAnimalStatus } from '../animals/animals.service.js';
import { notifyOperationalStaff, notifyUser } from '../notifications/notifications.service.js';
import {
  hasPermission,
  normalizeRole,
} from '../shared/rolePolicies.js';

const ACTIVE_ADOPTION_REQUEST_STATUSES = ['pending', 'under-review', 'approved'];
const STAFF_ROLES = new Set(['employee', 'admin']);
const ADOPTION_REQUEST_ID_PATTERN = /^[0-9a-f]{24}$/i;
const RESERVED_ANIMAL_ADOPTION_STATUSES = ['under-review', 'approved'];
const PROTECTED_CARE_SPECIES = new Set(PROTECTED_CARE_SPECIES_VALUES);
const HOUSING_TYPE_VALUES = ADOPTION_HOUSING_TYPE_VALUES;
const YARD_SECURITY_VALUES = ADOPTION_YARD_SECURITY_VALUES;
const ANIMAL_LIVING_PLACE_VALUES = ADOPTION_ANIMAL_LIVING_PLACE_VALUES;
const ANIMAL_ALLERGY_VALUES = ADOPTION_ANIMAL_ALLERGY_VALUES;
const OTHER_PET_SPECIES_VALUES = ADOPTION_OTHER_PET_SPECIES_VALUES;
const OTHER_PET_SEX_VALUES = ADOPTION_OTHER_PET_SEX_VALUES;
const OTHER_PET_CARE_STATUS_VALUES = ADOPTION_OTHER_PET_CARE_STATUS_VALUES;
const ANIMAL_TRANSPORT_VALUES = ADOPTION_TRANSPORT_VALUES;
const ADOPTION_REQUEST_STATUS_TRANSITIONS = ADOPTION_STATUS_TRANSITIONS;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLimitedText(value, fieldName, maxLength) {
  const text = normalizeText(value);

  if (text.length > maxLength) {
    throw createHttpError(400, `Полето "${fieldName}" не може да бъде по-дълго от ${maxLength} символа.`);
  }

  return text;
}

function normalizeLookupText(value) {
  return normalizeText(value).toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEnumValue(value, allowedValues, fieldName) {
  const normalizedValue = normalizeLookupText(value);

  if (!allowedValues.includes(normalizedValue)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалидна стойност.`, {
      allowedValues,
    });
  }

  return normalizedValue;
}

function normalizeRequiredBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  throw createHttpError(400, `Полето "${fieldName}" трябва да бъде с отговор "Да" или "Не".`);
}

function normalizeOptionalBoolean(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return normalizeRequiredBoolean(value, fieldName);
}

function normalizeIntegerInRange(value, fieldName, min, max) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < min || numberValue > max) {
    throw createHttpError(400, `Полето "${fieldName}" трябва да бъде цяло число между ${min} и ${max}.`);
  }

  return numberValue;
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

  if (!ADOPTION_STATUS_VALUES.includes(status)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалидна стойност.`, {
      allowedStatuses: ADOPTION_STATUS_VALUES,
    });
  }

  return status;
}

function normalizeOtherPet(entry, index) {
  if (!isPlainObject(entry)) {
    throw createHttpError(400, `Полето "otherPets[${index}]" трябва да бъде обект.`);
  }

  const species = normalizeEnumValue(
    entry.species,
    OTHER_PET_SPECIES_VALUES,
    `otherPets[${index}].species`
  );
  const otherSpecies =
    species === 'other'
      ? normalizeLimitedText(entry.otherSpecies, `otherPets[${index}].otherSpecies`, 120)
      : '';

  if (species === 'other' && !otherSpecies) {
    throw createHttpError(400, `Полето "otherPets[${index}].otherSpecies" е задължително при вид "Друго".`);
  }

  return {
    species,
    otherSpecies,
    sex: normalizeEnumValue(entry.sex, OTHER_PET_SEX_VALUES, `otherPets[${index}].sex`),
    neuteringStatus: normalizeEnumValue(
      entry.neuteringStatus,
      OTHER_PET_CARE_STATUS_VALUES,
      `otherPets[${index}].neuteringStatus`
    ),
    vaccinationStatus: normalizeEnumValue(
      entry.vaccinationStatus,
      OTHER_PET_CARE_STATUS_VALUES,
      `otherPets[${index}].vaccinationStatus`
    ),
    approximateAge: normalizeLimitedText(entry.approximateAge, `otherPets[${index}].approximateAge`, 120),
  };
}

function normalizeOtherPets(payload, hasOtherPets) {
  if (!hasOtherPets) {
    return [];
  }

  if (!Array.isArray(payload.otherPets) || payload.otherPets.length === 0) {
    throw createHttpError(400, 'При отговор "Да" за други животни трябва да добавиш поне едно животно.');
  }

  if (payload.otherPets.length > ADOPTION_MAX_OTHER_PETS) {
    throw createHttpError(400, `Могат да бъдат добавени най-много ${ADOPTION_MAX_OTHER_PETS} животни.`);
  }

  return payload.otherPets.map((entry, index) => normalizeOtherPet(entry, index));
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
  assertAllowedFields(payload, [
    'animalId',
    'motivation',
    'contactPhone',
    'housingType',
    'housingTypeOther',
    'hasYard',
    'yardSecurity',
    'animalLivingPlace',
    'animalLivingPlaceOther',
    'householdMembersCount',
    'hasAnimalAllergies',
    'hasOtherPets',
    'otherPets',
    'hasPreviousPetExperience',
    'previousPetExperienceDetails',
    'acceptsUnexpectedMedicalCosts',
    'animalTransport',
  ]);

  const animalId = assertValidAnimalId(payload.animalId);
  const motivation = normalizeLimitedText(
    payload.motivation,
    'motivation',
    1500
  );
  const contactPhone = normalizeText(payload.contactPhone);
  const housingType = normalizeEnumValue(payload.housingType, HOUSING_TYPE_VALUES, 'housingType');
  const housingTypeOther =
    housingType === 'other'
      ? normalizeLimitedText(payload.housingTypeOther, 'housingTypeOther', 120)
      : '';
  const hasYard = housingType === 'house' ? normalizeOptionalBoolean(payload.hasYard, 'hasYard') : null;
  const yardSecurity =
    housingType === 'house' && hasYard === true
      ? normalizeEnumValue(payload.yardSecurity, YARD_SECURITY_VALUES, 'yardSecurity')
      : null;
  const animalLivingPlace = normalizeEnumValue(
    payload.animalLivingPlace,
    ANIMAL_LIVING_PLACE_VALUES,
    'animalLivingPlace'
  );
  const animalLivingPlaceOther =
    animalLivingPlace === 'other'
      ? normalizeLimitedText(payload.animalLivingPlaceOther, 'animalLivingPlaceOther', 160)
      : '';
  const householdMembersCount = normalizeIntegerInRange(
    payload.householdMembersCount,
    'householdMembersCount',
    1,
    20
  );
  const hasAnimalAllergies = normalizeEnumValue(
    payload.hasAnimalAllergies,
    ANIMAL_ALLERGY_VALUES,
    'hasAnimalAllergies'
  );
  const hasOtherPets = normalizeRequiredBoolean(payload.hasOtherPets, 'hasOtherPets');
  const otherPets = normalizeOtherPets(payload, hasOtherPets);
  const hasPreviousPetExperience = normalizeRequiredBoolean(
    payload.hasPreviousPetExperience,
    'hasPreviousPetExperience'
  );
  const previousPetExperienceDetails = hasPreviousPetExperience
    ? normalizeLimitedText(payload.previousPetExperienceDetails, 'previousPetExperienceDetails', 1000)
    : '';
  const acceptsUnexpectedMedicalCosts = normalizeRequiredBoolean(
    payload.acceptsUnexpectedMedicalCosts,
    'acceptsUnexpectedMedicalCosts'
  );
  const animalTransport = normalizeEnumValue(payload.animalTransport, ANIMAL_TRANSPORT_VALUES, 'animalTransport');

  if (!motivation) {
    throw createHttpError(400, 'Полето "motivation" е задължително.');
  }

  if (motivation.length < 20) {
    throw createHttpError(400, 'Полето "motivation" трябва да бъде поне 20 символа.');
  }

  if (housingType === 'other' && !housingTypeOther) {
    throw createHttpError(400, 'Полето "housingTypeOther" е задължително при тип жилище "Друго".');
  }

  if (housingType === 'house' && hasYard === null) {
    throw createHttpError(400, 'Полето "hasYard" е задължително при тип жилище "Къща".');
  }

  if (animalLivingPlace === 'other' && !animalLivingPlaceOther) {
    throw createHttpError(400, 'Полето "animalLivingPlaceOther" е задължително при отговор "Друго".');
  }

  if (
    animalLivingPlace === 'secured-yard' &&
    (housingType !== 'house' || hasYard !== true || yardSecurity !== 'secured')
  ) {
    throw createHttpError(
      400,
      'Животното може да живее в обезопасен двор само при къща с потвърден обезопасен двор.'
    );
  }

  if (!contactPhone) {
    throw createHttpError(400, 'Полето "contactPhone" е задължително.');
  }

  if (!isValidAdoptionPhone(contactPhone)) {
    throw createHttpError(400, 'Полето "contactPhone" съдържа невалиден телефонен номер.');
  }

  return {
    animalId,
    motivation,
    contactPhone,
    housingType,
    housingTypeOther,
    hasYard,
    yardSecurity,
    animalLivingPlace,
    animalLivingPlaceOther,
    householdMembersCount,
    hasAnimalAllergies,
    hasOtherPets,
    otherPets,
    hasPreviousPetExperience,
    previousPetExperienceDetails,
    acceptsUnexpectedMedicalCosts,
    animalTransport,
  };
}

function normalizeStatusUpdatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['status', 'internalNote']);

  const status = normalizeStatus(payload.status, 'status');
  const internalNote = normalizeInternalNote(payload.internalNote);

  return {
    status,
    internalNote,
  };
}

function normalizeCancelPayload(payload) {
  const normalizedPayload = payload ?? {};

  assertBodyObject(normalizedPayload, { allowEmpty: true });
  assertAllowedFields(normalizedPayload, []);
  return {};
}

function normalizeInternalNote(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw createHttpError(400, 'Полето "internalNote" трябва да бъде текст.');
  }

  const note = normalizeLimitedText(value, 'internalNote', ADOPTION_TEXT_LIMITS.internalNote);
  return note || null;
}

function buildActorName(currentUser) {
  const authorName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim();
  return authorName || currentUser.username || '';
}

function buildInternalNote(text, currentUser) {
  if (!text) {
    return null;
  }

  return {
    text,
    author: mongoose.isValidObjectId(currentUser.id) ? currentUser.id : null,
    authorId: currentUser.id,
    authorName: buildActorName(currentUser),
    createdAt: new Date().toISOString(),
  };
}

function buildStatusHistoryEntry(fromStatus, toStatus, currentUser) {
  if (!toStatus || fromStatus === toStatus) {
    return null;
  }

  return {
    fromStatus: fromStatus ?? '',
    toStatus,
    changedBy: mongoose.isValidObjectId(currentUser?.id) ? currentUser.id : null,
    changedByName: currentUser ? buildActorName(currentUser) : '',
    changedAt: new Date().toISOString(),
  };
}

async function runAdoptionNotification(action, context) {
  try {
    await action();
  } catch (error) {
    console.error(`[adoptions] ${context} notification failed`, error);
  }
}

function applySession(query, session) {
  if (session) {
    query.session(session);
  }

  return query;
}

async function runAdoptionTransaction(work) {
  // Request and animal lifecycle writes must commit together so a failed CAS cannot desynchronize them.
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        result = await work(session);
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
}

function getPrimaryImageUrl(animal) {
  if (Array.isArray(animal.imageUrls) && animal.imageUrls.length > 0) {
    return animal.imageUrls[0];
  }

  return animal.imageUrl ?? '';
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
    species: animal.species ?? '',
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

function serializeStatusHistory(statusHistory = []) {
  if (!Array.isArray(statusHistory)) {
    return [];
  }

  return statusHistory.map((entry) => ({
    fromStatus: entry.fromStatus ?? '',
    toStatus: entry.toStatus ?? '',
    changedById: serializeId(entry.changedBy),
    changedByName: entry.changedByName ?? '',
    changedAt: normalizeDateOutput(entry.changedAt),
  }));
}

function serializeOtherPets(otherPets = []) {
  if (!Array.isArray(otherPets)) {
    return [];
  }

  return otherPets.map((pet) => ({
    species: pet.species ?? '',
    otherSpecies: pet.otherSpecies ?? '',
    sex: pet.sex ?? '',
    neuteringStatus: pet.neuteringStatus ?? '',
    vaccinationStatus: pet.vaccinationStatus ?? '',
    approximateAge: pet.approximateAge ?? '',
  }));
}

function canViewerSeeInternalNotes(currentUser) {
  return STAFF_ROLES.has(normalizeRole(currentUser?.role));
}

function serializeAdoptionRequest(adoptionRequest, currentUser = null) {
  const user = serializeUserSnapshot(adoptionRequest.user ?? adoptionRequest.userId);
  const animal = serializeAnimalSnapshot(adoptionRequest.animal ?? adoptionRequest.animalId);
  const motivation = adoptionRequest.motivation ?? '';

  return {
    id: adoptionRequest.id ?? serializeId(adoptionRequest),
    userId: user.id,
    user,
    animalId: animal.id,
    animal,
    status: adoptionRequest.status,
    motivation,
    contactPhone: adoptionRequest.contactPhone ?? '',
    housingType: adoptionRequest.housingType ?? '',
    housingTypeOther: adoptionRequest.housingTypeOther ?? '',
    hasYard: adoptionRequest.hasYard ?? null,
    yardSecurity: adoptionRequest.yardSecurity ?? null,
    animalLivingPlace: adoptionRequest.animalLivingPlace ?? '',
    animalLivingPlaceOther: adoptionRequest.animalLivingPlaceOther ?? '',
    householdMembersCount: adoptionRequest.householdMembersCount ?? null,
    hasAnimalAllergies: adoptionRequest.hasAnimalAllergies ?? '',
    hasOtherPets: adoptionRequest.hasOtherPets ?? null,
    otherPets: serializeOtherPets(adoptionRequest.otherPets),
    hasPreviousPetExperience: adoptionRequest.hasPreviousPetExperience ?? null,
    previousPetExperienceDetails: adoptionRequest.previousPetExperienceDetails ?? '',
    acceptsUnexpectedMedicalCosts: adoptionRequest.acceptsUnexpectedMedicalCosts ?? null,
    animalTransport: adoptionRequest.animalTransport ?? '',
    internalNotes: canViewerSeeInternalNotes(currentUser)
      ? serializeInternalNotes(adoptionRequest.internalNotes)
      : [],
    statusHistory: canViewerSeeInternalNotes(currentUser)
      ? serializeStatusHistory(adoptionRequest.statusHistory)
      : [],
    createdAt: normalizeDateOutput(adoptionRequest.createdAt),
    updatedAt: normalizeDateOutput(adoptionRequest.updatedAt),
  };
}

function buildRequestQuery(filters = {}) {
  const status = normalizeOptionalStatus(filters.status);
  return status ? { status } : {};
}

async function buildStaffRequestQuery(filters = {}) {
  const query = buildRequestQuery(filters);
  const search = normalizeLookupText(filters.search);

  if (!search) {
    return query;
  }

  const regex = new RegExp(escapeRegex(search), 'i');
  const [matchingUsers, matchingAnimals] = await Promise.all([
    User.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { username: regex },
        { email: regex },
      ],
    })
      .select('_id')
      .lean(),
    Animal.find({
      $or: [
        { slug: regex },
        { name: regex },
        { displayName: regex },
        { species: regex },
        { breed: regex },
      ],
    })
      .select('_id')
      .lean(),
  ]);
  const userIds = matchingUsers.map((user) => user._id);
  const animalIds = matchingAnimals.map((animal) => animal._id);
  const searchConditions = [
    { contactPhone: regex },
    ...(userIds.length > 0 ? [{ user: { $in: userIds } }] : []),
    ...(animalIds.length > 0 ? [{ animal: { $in: animalIds } }] : []),
  ];

  return {
    ...query,
    $or: searchConditions,
  };
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

async function getCurrentAnimalForRequest(adoptionRequest, options = {}) {
  const animalId = getRequestAnimalLookupId(adoptionRequest);

  if (!animalId) {
    throw createHttpError(409, 'Заявката не е свързана с валидно животно.');
  }

  const { query } = buildAnimalLookupQuery(animalId);
  const animal = await applySession(Animal.findOne(query), options.session).lean();

  if (!animal) {
    throw createHttpError(404, 'Свързаното животно не беше намерено.');
  }

  return animal;
}

async function hasCompetingReservedRequest(adoptionRequest, options = {}) {
  const currentRequestId = serializeId(adoptionRequest);
  const animalStorageId = getRequestAnimalStorageId(adoptionRequest);

  if (!mongoose.isValidObjectId(animalStorageId)) {
    return false;
  }

  // Check only other active requests that already reserve the same animal for staff processing.
  const competingRequest = await applySession(
    AdoptionRequest.findOne({
      _id: { $ne: currentRequestId },
      animal: animalStorageId,
      status: { $in: RESERVED_ANIMAL_ADOPTION_STATUSES },
    }),
    options.session
  ).lean();

  return Boolean(competingRequest);
}

async function assertNoCompetingReservedRequest(adoptionRequest, options = {}) {
  const hasCompetingRequest = await hasCompetingReservedRequest(adoptionRequest, options);

  if (hasCompetingRequest) {
    throw createHttpError(
      409,
      'Вече има друга активна служебна заявка, която резервира това животно.'
    );
  }
}

function isProtectedCareSpeciesValue(species) {
  return PROTECTED_CARE_SPECIES.has(normalizeLookupText(species));
}

function getReturnedAnimalStatusAfterCancelledRequest(animal) {
  return isProtectedCareSpeciesValue(animal.species) ? 'protected-care' : 'available';
}

// Keep the animal lifecycle synchronized with adoption workflow transitions,
// including reservation, completion and release after rejection or cancellation.
async function synchronizeAnimalForAdoptionStatus(adoptionRequest, nextStatus, options = {}) {
  const currentStatus = adoptionRequest.status;

  if (!nextStatus || currentStatus === nextStatus) {
    return null;
  }

  const animalId = getRequestAnimalLookupId(adoptionRequest);

  if (RESERVED_ANIMAL_ADOPTION_STATUSES.includes(nextStatus)) {
    await assertNoCompetingReservedRequest(adoptionRequest, options);
    const animal = await getCurrentAnimalForRequest(adoptionRequest, options);

    if (animal.status === 'reserved') {
      return animal;
    }

    if (isProtectedCareSpeciesValue(animal.species)) {
      throw createHttpError(
        409,
        'Това животно е част от защитена или специализирана грижа и не може да бъде резервирано по стандартна заявка за осиновяване.'
      );
    }

    if (animal.status !== 'available') {
      throw createHttpError(
        409,
        'Животното трябва да бъде със статус "available", за да бъде резервирано за заявка.'
      );
    }

    return updateAnimalStatus(animalId, { status: 'reserved' }, null, {
      allowSystemManagedStatuses: true,
      session: options.session,
    });
  }

  if (nextStatus === 'completed') {
    const animal = await getCurrentAnimalForRequest(adoptionRequest, options);

    if (animal.status === 'adopted') {
      return animal;
    }

    if (isProtectedCareSpeciesValue(animal.species)) {
      throw createHttpError(
        409,
        'Това животно е част от защитена или специализирана грижа и не може да бъде финализирано като стандартно осиновяване.'
      );
    }

    if (animal.status !== 'reserved') {
      throw createHttpError(
        409,
        'Животното трябва да бъде със статус "reserved", преди осиновяването да бъде завършено.'
      );
    }

    return updateAnimalStatus(animalId, { status: 'adopted' }, null, {
      allowSystemManagedStatuses: true,
      session: options.session,
    });
  }

  if (
    ['rejected', 'cancelled'].includes(nextStatus) &&
    RESERVED_ANIMAL_ADOPTION_STATUSES.includes(currentStatus)
  ) {
    const animal = await getCurrentAnimalForRequest(adoptionRequest, options);

    if (animal.status !== 'reserved') {
      return animal;
    }

    const hasCompetingRequest = await hasCompetingReservedRequest(adoptionRequest, options);

    // Keep the animal reserved when another active request still depends on the reservation.
    if (hasCompetingRequest) {
      return animal;
    }

    return updateAnimalStatus(
      animalId,
      { status: getReturnedAnimalStatusAfterCancelledRequest(animal) },
      null,
      {
        allowSystemManagedStatuses: true,
        session: options.session,
      }
    );
  }

  return null;
}

async function findAnimalForRequest(animalId) {
  const normalizedAnimalId = assertValidAnimalId(animalId);
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

async function assertNoActiveDuplicate(currentUser, animalContext) {
  const existingRequest = await AdoptionRequest.findOne({
    user: currentUser.id,
    animal: animalContext.storageId,
    status: { $in: ACTIVE_ADOPTION_REQUEST_STATUSES },
  }).lean();

  if (existingRequest) {
    throw createHttpError(409, 'Вече имаш активна заявка за осиновяване на това животно.');
  }
}

async function findAdoptionRequestById(requestId, options = {}) {
  const normalizedRequestId = assertValidRequestId(requestId);

  if (!mongoose.isValidObjectId(normalizedRequestId)) {
    return null;
  }

  return applySession(
    AdoptionRequest.findById(normalizedRequestId)
      .populate('user', 'firstName lastName username email role')
      .populate('animal', 'slug name displayName species breed status imageUrls imageUrl'),
    options.session
  ).lean();
}

async function getPopulatedAdoptionRequest(requestId, options = {}) {
  return applySession(
    AdoptionRequest.findById(requestId)
      .populate('user', 'firstName lastName username email role')
      .populate('animal', 'slug name displayName species breed status imageUrls imageUrl'),
    options.session
  ).lean();
}

function canUseStandardAdoptionFlow(animalContext) {
  const species = normalizeLookupText(animalContext.snapshot.species ?? animalContext.record.species);

  return (
    animalContext.snapshot.status === 'available' &&
    animalContext.record.isActive !== false &&
    !PROTECTED_CARE_SPECIES.has(species)
  );
}

function buildUnavailableAdoptionMessage(animalContext) {
  const species = normalizeLookupText(animalContext.snapshot.species ?? animalContext.record.species);

  if (PROTECTED_CARE_SPECIES.has(species)) {
    return 'Това животно е част от защитена или специализирана грижа и не приема стандартни заявки за осиновяване.';
  }

  return 'Заявка за осиновяване може да се подаде само за животно със статус "available".';
}

export async function createAdoptionRequest(payload, currentUser) {
  assertClientCanCreate(currentUser);
  const normalizedPayload = normalizeCreatePayload(payload);
  const animalContext = await findAnimalForRequest(normalizedPayload.animalId);

  if (!animalContext) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  if (!canUseStandardAdoptionFlow(animalContext)) {
    throw createHttpError(
      409,
      buildUnavailableAdoptionMessage(animalContext)
    );
  }

  await assertNoActiveDuplicate(currentUser, animalContext);

  const createdRequest = await AdoptionRequest.create({
    user: currentUser.id,
    animal: animalContext.storageId,
    status: 'pending',
    statusHistory: [buildStatusHistoryEntry('', 'pending', currentUser)],
    motivation: normalizedPayload.motivation,
    contactPhone: normalizedPayload.contactPhone,
    housingType: normalizedPayload.housingType,
    housingTypeOther: normalizedPayload.housingTypeOther,
    hasYard: normalizedPayload.hasYard,
    yardSecurity: normalizedPayload.yardSecurity,
    animalLivingPlace: normalizedPayload.animalLivingPlace,
    animalLivingPlaceOther: normalizedPayload.animalLivingPlaceOther,
    householdMembersCount: normalizedPayload.householdMembersCount,
    hasAnimalAllergies: normalizedPayload.hasAnimalAllergies,
    hasOtherPets: normalizedPayload.hasOtherPets,
    otherPets: normalizedPayload.otherPets,
    hasPreviousPetExperience: normalizedPayload.hasPreviousPetExperience,
    previousPetExperienceDetails: normalizedPayload.previousPetExperienceDetails,
    acceptsUnexpectedMedicalCosts: normalizedPayload.acceptsUnexpectedMedicalCosts,
    animalTransport: normalizedPayload.animalTransport,
  });
  const populatedRequest = await getPopulatedAdoptionRequest(createdRequest._id);
  const serializedRequest = serializeAdoptionRequest(populatedRequest, currentUser);
  const animalName = serializedRequest.animal.displayName || serializedRequest.animal.name || 'животно';

  await runAdoptionNotification(
    () =>
      notifyOperationalStaff({
        type: 'adoption-created',
        title: 'Нова заявка за осиновяване',
        message: `Получена е нова заявка за осиновяване на ${animalName}.`,
        resourceId: serializedRequest.id,
      }),
    'operational staff adoption-created'
  );

  return serializedRequest;
}

export async function getOwnAdoptionRequestCollection(currentUser, filters = {}) {
  assertPermission(currentUser, 'list-own');
  const query = buildRequestQuery(filters);
  const mongoQuery = {
    user: currentUser.id,
    ...query,
  };
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: 10,
    maxLimit: 30,
  });
  const total = await AdoptionRequest.countDocuments(mongoQuery);
  const pagination = buildPagination(total, paginationOptions);
  const requests = await readWorkflowCollectionPage({
    model: AdoptionRequest,
    query: mongoQuery,
    pagination,
    statusTransitions: ADOPTION_STATUS_TRANSITIONS,
    configureQuery: (requestQuery) =>
      requestQuery
        .populate('user', 'firstName lastName username email role')
        .populate('animal', 'slug name displayName species breed status imageUrls imageUrl'),
  });

  return {
    items: requests.map((entry) => serializeAdoptionRequest(entry, currentUser)),
    total,
    pagination,
  };
}

export async function getAllAdoptionRequestCollection(currentUser, filters = {}) {
  assertPermission(currentUser, 'view-all');
  assertStaffCanManage(currentUser);
  const query = await buildStaffRequestQuery(filters);
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: 20,
    maxLimit: 50,
  });
  const total = await AdoptionRequest.countDocuments(query);
  const pagination = buildPagination(total, paginationOptions);
  const requests = await readWorkflowCollectionPage({
    model: AdoptionRequest,
    query,
    pagination,
    statusTransitions: ADOPTION_STATUS_TRANSITIONS,
    configureQuery: (requestQuery) =>
      requestQuery
        .populate('user', 'firstName lastName username email role')
        .populate('animal', 'slug name displayName species breed status imageUrls imageUrl'),
  });

  return {
    items: requests.map((entry) => serializeAdoptionRequest(entry, currentUser)),
    total,
    pagination,
  };
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
  let previousStatus = '';

  const updatedRequestId = await runAdoptionTransaction(async (session) => {
    const existingRequest = await findAdoptionRequestById(normalizedRequestId, {
      session,
    });

    if (!existingRequest) {
      throw createHttpError(404, 'Заявката за осиновяване не беше намерена.');
    }

    if (existingRequest.status === normalizedPayload.status) {
      throw createHttpError(409, 'Заявката вече е с този статус.');
    }

    previousStatus = existingRequest.status;
    assertAllowedStatusTransition(existingRequest.status, normalizedPayload.status);
    const internalNote = buildInternalNote(normalizedPayload.internalNote, currentUser);
    const statusHistoryEntry = buildStatusHistoryEntry(
      existingRequest.status,
      normalizedPayload.status,
      currentUser
    );
    await synchronizeAnimalForAdoptionStatus(
      existingRequest,
      normalizedPayload.status,
      { session }
    );
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

    if (statusHistoryEntry) {
      updateOperation.$push = {
        ...(updateOperation.$push ?? {}),
        statusHistory: statusHistoryEntry,
      };
    }

    // Matching the status read above turns this into a compare-and-set operation between concurrent reviews.
    const updatedRequest = await AdoptionRequest.findOneAndUpdate(
      {
        _id: normalizedRequestId,
        status: existingRequest.status,
      },
      updateOperation,
      {
        returnDocument: 'after',
        runValidators: true,
        session,
      }
    ).lean();

    if (!updatedRequest) {
      throw createHttpError(409, 'Заявката е променена от друга операция. Обнови данните.');
    }

    return serializeId(updatedRequest);
  });

  const updatedRequest = await getPopulatedAdoptionRequest(updatedRequestId);

  if (!updatedRequest) {
    throw createHttpError(404, 'Заявката за осиновяване не беше намерена.');
  }

  const serializedRequest = serializeAdoptionRequest(updatedRequest, currentUser);

  if (previousStatus !== normalizedPayload.status) {
    const animalName = serializedRequest.animal.displayName || serializedRequest.animal.name || 'животното';
    const statusLabel = ADOPTION_STATUS_LABELS[normalizedPayload.status] ?? normalizedPayload.status;

    await runAdoptionNotification(
      () =>
        notifyUser(serializedRequest.userId, {
          type: 'adoption-status-updated',
          title: 'Промяна по заявка за осиновяване',
          message: `Статусът на заявката ти за ${animalName} е променен на "${statusLabel}".`,
          resourceId: serializedRequest.id,
        }),
      'client adoption-status-updated'
    );
  }

  return serializedRequest;
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

  const updatedRequest = await AdoptionRequest.findOneAndUpdate(
    {
      _id: normalizedRequestId,
      user: currentUser.id,
      status: 'pending',
    },
    {
      $set: {
        status: 'cancelled',
      },
      $push: {
        statusHistory: buildStatusHistoryEntry(existingRequest.status, 'cancelled', currentUser),
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  )
    .populate('user', 'firstName lastName username email role')
    .populate('animal', 'slug name displayName species breed status imageUrls imageUrl')
    .lean();

  if (!updatedRequest) {
    throw createHttpError(409, 'Заявката е променена от друга операция. Обнови данните.');
  }

  return serializeAdoptionRequest(updatedRequest, currentUser);
}
