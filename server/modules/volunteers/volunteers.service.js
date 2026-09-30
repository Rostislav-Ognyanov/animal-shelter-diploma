import mongoose from 'mongoose';

import VolunteerApplication from '../../models/VolunteerApplication.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { readWorkflowCollectionPage } from '../../utils/workflowList.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { normalizeDateOutput, serializeId } from '../../utils/serialization.js';
import { createDuplicateKeyHttpError } from '../../utils/mongoErrors.js';
import { hasPermission } from '../shared/rolePolicies.js';
import { notifyOperationalStaff } from '../notifications/notifications.service.js';
import {
  ACTIVE_VOLUNTEER_STATUS_VALUES,
  MAX_VOLUNTEER_AGE,
  MIN_VOLUNTEER_AGE,
  VOLUNTEER_POSITION_LABELS,
  VOLUNTEER_POSITION_VALUES,
  VOLUNTEER_STATUS_LABELS,
  VOLUNTEER_STATUS_TRANSITIONS,
  VOLUNTEER_STATUS_VALUES,
  VOLUNTEER_TEXT_LIMITS,
} from '../../../shared/domain/volunteerConstants.js';
import { isValidPhone } from '../../../shared/domain/contactValidation.js';
import { EMAIL_PATTERN } from '../../../shared/domain/userConstants.js';

const VOLUNTEER_APPLICATION_ID_PATTERN = /^[0-9a-f]{24}$/i;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLimitedText(value, fieldName, maxLength) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.length > maxLength) {
    throw createHttpError(
      400,
      `Полето "${fieldName}" може да съдържа най-много ${maxLength} символа.`
    );
  }

  return normalizedValue;
}

function normalizeLookupText(value) {
  return normalizeText(value).toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertStaffPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'volunteers', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function parseVolunteerAge(value) {
  const numericValue = Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue < MIN_VOLUNTEER_AGE ||
    numericValue > MAX_VOLUNTEER_AGE
  ) {
    throw createHttpError(
      400,
      `Възрастта трябва да бъде между ${MIN_VOLUNTEER_AGE} и ${MAX_VOLUNTEER_AGE} години.`
    );
  }

  return numericValue;
}

function parseStrictBooleanField(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  throw createHttpError(400, `Полето "${fieldName}" трябва да бъде булева стойност.`);
}

function isMinorApplication(application) {
  const age = Number(application?.age);
  return Number.isInteger(age) && age > 0 && age < 18;
}

function isActiveVolunteerApplicationStatus(status) {
  return ACTIVE_VOLUNTEER_STATUS_VALUES.includes(status);
}

function isValidGuardianContact(value) {
  return EMAIL_PATTERN.test(value) || isValidPhone(value);
}

function normalizeVolunteerStatus(value, fieldName = 'status') {
  const normalizedStatus = normalizeLookupText(value);

  if (!VOLUNTEER_STATUS_VALUES.includes(normalizedStatus)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалидна стойност.`, {
      allowedStatuses: VOLUNTEER_STATUS_VALUES,
    });
  }

  return normalizedStatus;
}

function normalizeOptionalVolunteerStatus(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return normalizeVolunteerStatus(value);
}

function normalizeVolunteerPosition(value) {
  const normalizedPosition = normalizeLookupText(value);

  if (!VOLUNTEER_POSITION_VALUES.includes(normalizedPosition)) {
    throw createHttpError(400, 'Полето "preferredPositions" съдържа невалидна стойност.', {
      allowedPositions: VOLUNTEER_POSITION_VALUES,
    });
  }

  return normalizedPosition;
}

function normalizeVolunteerPositions(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const normalizedPositions = [];

  for (const rawValue of rawValues) {
    const normalizedPosition = normalizeVolunteerPosition(rawValue);

    if (!normalizedPositions.includes(normalizedPosition)) {
      normalizedPositions.push(normalizedPosition);
    }
  }

  return normalizedPositions;
}

function getVolunteerPositionLabels(positions) {
  return positions.map((position) => VOLUNTEER_POSITION_LABELS[position] ?? position);
}

function assertValidVolunteerApplicationId(applicationId) {
  const normalizedId = normalizeText(applicationId);

  if (!normalizedId) {
    throw createHttpError(400, 'Липсва идентификатор на кандидатурата.');
  }

  if (!VOLUNTEER_APPLICATION_ID_PATTERN.test(normalizedId)) {
    throw createHttpError(400, 'Идентификаторът на кандидатурата е в невалиден формат.');
  }

  return normalizedId;
}

function normalizeCreatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, [
    'firstName',
    'lastName',
    'email',
    'phone',
    'age',
    'guardianName',
    'guardianContact',
    'preferredPositions',
    'otherPosition',
    'motivation',
    'experience',
    'availability',
  ]);

  const firstName = normalizeLimitedText(payload.firstName, 'firstName', VOLUNTEER_TEXT_LIMITS.firstName);
  const lastName = normalizeLimitedText(payload.lastName, 'lastName', VOLUNTEER_TEXT_LIMITS.lastName);
  const email = normalizeLimitedText(
    normalizeLookupText(payload.email),
    'email',
    VOLUNTEER_TEXT_LIMITS.email
  );
  const phone = normalizeLimitedText(payload.phone, 'phone', VOLUNTEER_TEXT_LIMITS.phone);
  const age = parseVolunteerAge(payload.age);
  const guardianName = normalizeLimitedText(
    payload.guardianName,
    'guardianName',
    VOLUNTEER_TEXT_LIMITS.guardianName
  );
  const guardianContact = normalizeLimitedText(
    payload.guardianContact,
    'guardianContact',
    VOLUNTEER_TEXT_LIMITS.guardianContact
  );
  const preferredPositions = normalizeVolunteerPositions(payload.preferredPositions);
  const otherPosition = normalizeLimitedText(
    payload.otherPosition,
    'otherPosition',
    VOLUNTEER_TEXT_LIMITS.otherPosition
  );
  const motivation = normalizeLimitedText(payload.motivation, 'motivation', VOLUNTEER_TEXT_LIMITS.motivation);
  const experience = normalizeLimitedText(payload.experience, 'experience', VOLUNTEER_TEXT_LIMITS.experience);
  const availability = normalizeLimitedText(
    payload.availability,
    'availability',
    VOLUNTEER_TEXT_LIMITS.availability
  );
  const isMinor = age < 18;

  if (otherPosition && !preferredPositions.includes('other')) {
    preferredPositions.push('other');
  }

  if (!firstName || !lastName || !email || !phone || !motivation || !availability) {
    throw createHttpError(400, 'Попълни всички задължителни полета на кандидатурата.');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (!isValidPhone(phone)) {
    throw createHttpError(400, 'Въведи валиден телефонен номер.');
  }

  if (preferredPositions.length === 0) {
    throw createHttpError(400, 'Избери поне една доброволческа позиция.');
  }

  if (preferredPositions.includes('other') && !otherPosition) {
    throw createHttpError(400, 'Попълни полето "Друго", когато е избрана тази позиция.');
  }

  if (isMinor) {
    if (!guardianName || !guardianContact) {
      throw createHttpError(400, 'Попълни името и контакта на родител или настойник.');
    }

    if (!isValidGuardianContact(guardianContact)) {
      throw createHttpError(400, 'Въведи валиден телефон или имейл за родител/настойник.');
    }
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    age,
    guardianConsentVerified: false,
    guardianName: isMinor ? guardianName : '',
    guardianContact: isMinor ? guardianContact : '',
    preferredPositions,
    otherPosition: preferredPositions.includes('other') ? otherPosition : '',
    motivation,
    experience,
    availability,
  };
}

function normalizeReviewPayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['status', 'notes', 'guardianConsentVerified']);

  const normalizedPayload = {};

  if (payload.status !== undefined && payload.status !== null && payload.status !== '') {
    normalizedPayload.status = normalizeVolunteerStatus(payload.status);
  }

  if (payload.notes !== undefined) {
    const noteText = normalizeLimitedText(
      payload.notes,
      'notes',
      VOLUNTEER_TEXT_LIMITS.internalNote
    );

    if (noteText) {
      normalizedPayload.notes = noteText;
    }
  }

  if (payload.guardianConsentVerified !== undefined) {
    normalizedPayload.guardianConsentVerified = parseStrictBooleanField(
      payload.guardianConsentVerified,
      'guardianConsentVerified'
    );
  }

  if (Object.keys(normalizedPayload).length === 0) {
    throw createHttpError(400, 'Няма подадени промени за кандидатурата.');
  }

  return normalizedPayload;
}

function buildActorName(currentUser) {
  const authorName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim();
  return authorName || currentUser?.username || '';
}

function buildInternalNote(text, currentUser) {
  if (!text) {
    return null;
  }

  return {
    text,
    author: mongoose.isValidObjectId(currentUser?.id) ? currentUser.id : null,
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

function buildGuardianConsentAuditFields(isVerified, currentUser) {
  if (!isVerified) {
    return {
      guardianConsentVerifiedAt: null,
      guardianConsentVerifiedBy: null,
      guardianConsentVerifiedByName: '',
    };
  }

  return {
    guardianConsentVerifiedAt: new Date(),
    guardianConsentVerifiedBy: mongoose.isValidObjectId(currentUser?.id)
      ? currentUser.id
      : null,
    guardianConsentVerifiedByName: buildActorName(currentUser),
  };
}

function serializeInternalNotes(internalNotes = []) {
  return Array.isArray(internalNotes)
    ? internalNotes.map((note) => ({
        text: note.text ?? '',
        authorId: serializeId(note.author),
        authorName: note.authorName ?? '',
        createdAt: normalizeDateOutput(note.createdAt),
      }))
    : [];
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

function getAllowedStatusTransitionsForApplication(application, status) {
  const allowedTransitions = VOLUNTEER_STATUS_TRANSITIONS[status] ?? [];

  if (isMinorApplication(application) && !application.guardianConsentVerified) {
    return allowedTransitions.filter((nextStatus) => nextStatus !== 'approved');
  }

  return allowedTransitions;
}

function serializeVolunteerApplicationListItem(application) {
  const preferredPositions = Array.isArray(application.preferredPositions)
    ? application.preferredPositions.map((position) => String(position))
    : [];
  const status = application.status ?? 'pending';

  return {
    id: serializeId(application),
    firstName: application.firstName ?? '',
    lastName: application.lastName ?? '',
    email: application.email ?? '',
    phone: application.phone ?? '',
    preferredPositions,
    preferredPositionLabels: getVolunteerPositionLabels(preferredPositions),
    otherPosition: application.otherPosition ?? '',
    availability: application.availability ?? '',
    status,
    statusLabel: VOLUNTEER_STATUS_LABELS[status] ?? status,
    createdAt: normalizeDateOutput(application.createdAt),
  };
}

function serializeVolunteerApplication(application) {
  const preferredPositions = Array.isArray(application.preferredPositions)
    ? application.preferredPositions.map((position) => String(position))
    : [];
  const status = application.status ?? 'pending';

  return {
    id: serializeId(application),
    firstName: application.firstName ?? '',
    lastName: application.lastName ?? '',
    email: application.email ?? '',
    phone: application.phone ?? '',
    age: application.age ?? null,
    guardianConsentVerified: Boolean(application.guardianConsentVerified),
    guardianConsentVerifiedAt: normalizeDateOutput(application.guardianConsentVerifiedAt),
    guardianConsentVerifiedById: serializeId(application.guardianConsentVerifiedBy),
    guardianConsentVerifiedByName: application.guardianConsentVerifiedByName ?? '',
    guardianName: application.guardianName ?? '',
    guardianContact: application.guardianContact ?? '',
    preferredPositions,
    preferredPositionLabels: getVolunteerPositionLabels(preferredPositions),
    otherPosition: application.otherPosition ?? '',
    motivation: application.motivation ?? '',
    experience: application.experience ?? '',
    availability: application.availability ?? '',
    status,
    statusLabel: VOLUNTEER_STATUS_LABELS[status] ?? status,
    allowedStatusTransitions: getAllowedStatusTransitionsForApplication(application, status),
    internalNotes: serializeInternalNotes(application.internalNotes),
    statusHistory: serializeStatusHistory(application.statusHistory),
    createdAt: normalizeDateOutput(application.createdAt),
    updatedAt: normalizeDateOutput(application.updatedAt),
  };
}

function assertAllowedVolunteerStatusTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus || currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = VOLUNTEER_STATUS_TRANSITIONS[currentStatus] ?? [];

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

function assertGuardianConsentBeforeApproval(application, nextStatus, normalizedPayload) {
  const hasVerifiedGuardianConsent =
    normalizedPayload.guardianConsentVerified ?? Boolean(application.guardianConsentVerified);

  if (isMinorApplication(application) && nextStatus === 'approved' && !hasVerifiedGuardianConsent) {
    throw createHttpError(
      409,
      'Кандидатура на лице под 18 години не може да бъде одобрена без потвърдено съгласие от родител или настойник.'
    );
  }
}

function assertGuardianConsentVerificationApplies(application, normalizedPayload) {
  if (
    normalizedPayload.guardianConsentVerified !== undefined &&
    !isMinorApplication(application)
  ) {
    throw createHttpError(
      400,
      'Потвърждение от родител или настойник се прилага само за кандидати под 18 години.'
    );
  }
}

function buildVolunteerQuery(filters = {}) {
  const query = {};
  const status = normalizeOptionalVolunteerStatus(filters.status);
  const search = normalizeLookupText(filters.search);

  if (status) {
    query.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
      { guardianName: regex },
      { guardianContact: regex },
      { otherPosition: regex },
    ];
  }

  return query;
}

async function findVolunteerApplicationRecordById(applicationId) {
  const normalizedId = assertValidVolunteerApplicationId(applicationId);

  if (!mongoose.isValidObjectId(normalizedId)) {
    return null;
  }

  return VolunteerApplication.findById(normalizedId).lean();
}

async function assertNoActiveVolunteerApplicationForEmail(email) {
  const existingApplication = await VolunteerApplication.findOne({
    email,
    status: {
      $in: ACTIVE_VOLUNTEER_STATUS_VALUES,
    },
  }).lean();

  if (existingApplication) {
    throw createHttpError(
      409,
      'Вече има активна доброволческа кандидатура с този имейл адрес.'
    );
  }
}

function createDuplicateVolunteerApplicationConflictError(error) {
  return createDuplicateKeyHttpError(error, {
    fieldMessages: {
      activeApplicationEmail:
        'Вече има активна доброволческа кандидатура с този имейл адрес.',
    },
    fallbackMessage:
      'Вече има доброволческа кандидатура с тези данни.',
  });
}

async function notifyVolunteerApplicationCreated(serializedApplication) {
  try {
    await notifyOperationalStaff({
      type: 'volunteer-application-created',
      title: 'Нова доброволческа кандидатура',
      message: `Получена е нова кандидатура от ${serializedApplication.firstName} ${serializedApplication.lastName}.`,
      resourceId: serializedApplication.id,
    });
  } catch (error) {
    console.error(
      '[volunteers] volunteer-application-created notification failed',
      error
    );
  }
}

export async function createVolunteerApplication(payload) {
  const normalizedPayload = normalizeCreatePayload(payload);

  await assertNoActiveVolunteerApplicationForEmail(normalizedPayload.email);

  let createdApplication;

  try {
    createdApplication = await VolunteerApplication.create({
      ...normalizedPayload,
      status: 'pending',
      activeApplicationEmail: normalizedPayload.email,
      internalNotes: [],
      statusHistory: [buildStatusHistoryEntry('', 'pending', null)],
    });
  } catch (error) {
    const duplicateError = createDuplicateVolunteerApplicationConflictError(error);

    if (duplicateError) {
      throw duplicateError;
    }

    throw error;
  }

  const serializedApplication = serializeVolunteerApplication(createdApplication.toObject());

  await notifyVolunteerApplicationCreated(serializedApplication);

  return serializedApplication;
}

export async function getVolunteerApplicationCollection(currentUser, filters = {}) {
  assertStaffPermission(currentUser, 'view-all');
  const query = buildVolunteerQuery(filters);
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: 10,
    maxLimit: 50,
  });
  const total = await VolunteerApplication.countDocuments(query);
  const pagination = buildPagination(total, paginationOptions);
  const applications = await readWorkflowCollectionPage({
    model: VolunteerApplication,
    query,
    pagination,
    statusTransitions: VOLUNTEER_STATUS_TRANSITIONS,
    configureQuery: (applicationQuery) =>
      applicationQuery.select(
        'firstName lastName email phone preferredPositions otherPosition availability status createdAt'
      ),
  });

  return {
    items: applications.map(serializeVolunteerApplicationListItem),
    total,
    pagination,
  };
}

export async function getVolunteerApplicationById(applicationId, currentUser) {
  assertStaffPermission(currentUser, 'detail');
  const application = await findVolunteerApplicationRecordById(applicationId);

  if (!application) {
    throw createHttpError(404, 'Кандидатурата не беше намерена.');
  }

  return serializeVolunteerApplication(application);
}

export async function updateVolunteerApplicationReview(applicationId, payload, currentUser) {
  assertStaffPermission(currentUser, 'review');
  const normalizedId = assertValidVolunteerApplicationId(applicationId);
  const normalizedPayload = normalizeReviewPayload(payload);
  const application = await findVolunteerApplicationRecordById(normalizedId);

  if (!application) {
    throw createHttpError(404, 'Кандидатурата не беше намерена.');
  }

  const currentStatus = application.status ?? 'pending';
  const requestedStatus = normalizedPayload.status;
  const hasStatusChange =
    requestedStatus !== undefined && requestedStatus !== currentStatus;
  const nextStatus = hasStatusChange ? requestedStatus : currentStatus;
  assertGuardianConsentVerificationApplies(application, normalizedPayload);

  if (hasStatusChange) {
    assertAllowedVolunteerStatusTransition(currentStatus, nextStatus);
  }

  if (hasStatusChange || normalizedPayload.guardianConsentVerified !== undefined) {
    assertGuardianConsentBeforeApproval(application, nextStatus, normalizedPayload);
  }

  const internalNote = buildInternalNote(normalizedPayload.notes, currentUser);
  const hasGuardianConsentChange =
    normalizedPayload.guardianConsentVerified !== undefined &&
    normalizedPayload.guardianConsentVerified !==
      Boolean(application.guardianConsentVerified);

  if (!hasStatusChange && !hasGuardianConsentChange && !internalNote) {
    throw createHttpError(400, 'Няма промени за записване по кандидатурата.');
  }

  const statusHistoryEntry = hasStatusChange
    ? buildStatusHistoryEntry(currentStatus, nextStatus, currentUser)
    : null;

  const updatePayload = {};

  if (hasStatusChange || hasGuardianConsentChange) {
    updatePayload.$set = {};
  }

  if (hasStatusChange) {
    updatePayload.$set.status = nextStatus;
    updatePayload.$set.activeApplicationEmail =
      isActiveVolunteerApplicationStatus(nextStatus) ? application.email : null;
  }

  if (hasGuardianConsentChange) {
    updatePayload.$set.guardianConsentVerified = normalizedPayload.guardianConsentVerified;
    Object.assign(
      updatePayload.$set,
      buildGuardianConsentAuditFields(
        normalizedPayload.guardianConsentVerified,
        currentUser
      )
    );
  }

  if (statusHistoryEntry) {
    updatePayload.$push = {
      statusHistory: statusHistoryEntry,
    };
  }

  if (internalNote) {
    updatePayload.$push = {
      ...(updatePayload.$push ?? {}),
      internalNotes: internalNote,
    };
  }

  if (updatePayload.$set && Object.keys(updatePayload.$set).length === 0) {
    delete updatePayload.$set;
  }

  let updatedApplication;
  const expectedGuardianConsentVerified = Boolean(application.guardianConsentVerified);

  try {
    updatedApplication = await VolunteerApplication.findOneAndUpdate(
      {
        _id: normalizedId,
        status: currentStatus,
        guardianConsentVerified: expectedGuardianConsentVerified
          ? true
          : { $ne: true },
      },
      updatePayload,
      {
        returnDocument: 'after',
        runValidators: true,
      }
    ).lean();
  } catch (error) {
    const duplicateError = createDuplicateVolunteerApplicationConflictError(error);

    if (duplicateError) {
      throw duplicateError;
    }

    throw error;
  }

  if (!updatedApplication) {
    throw createHttpError(
      409,
      'Кандидатурата беше променена преди записването на заявката.',
      {
        currentStatus,
        requestedStatus: nextStatus,
        expectedGuardianConsentVerified,
      }
    );
  }

  return serializeVolunteerApplication(updatedApplication);
}
