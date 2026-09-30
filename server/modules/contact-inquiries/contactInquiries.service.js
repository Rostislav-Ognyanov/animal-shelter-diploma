import mongoose from 'mongoose';

import ContactInquiry from '../../models/ContactInquiry.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { readWorkflowCollectionPage } from '../../utils/workflowList.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { normalizeDateOutput, serializeId } from '../../utils/serialization.js';
import { EMAIL_PATTERN } from '../../../shared/domain/userConstants.js';
import { isValidPhone } from '../../../shared/domain/contactValidation.js';
import { PROTECTED_CARE_SPECIES_VALUES } from '../../../shared/domain/animalConstants.js';
import { getAnimalReferenceById } from '../animals/animals.service.js';
import { hasPermission } from '../shared/rolePolicies.js';
import { notifyOperationalStaff } from '../notifications/notifications.service.js';
import {
  CONTACT_INQUIRY_ADOPTION_SUBJECT_VALUES,
  CONTACT_INQUIRY_DONATION_TOPIC_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_VALUES,
  CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_VALUES,
  CONTACT_INQUIRY_STATUS_LABELS,
  CONTACT_INQUIRY_STATUS_TRANSITIONS,
  CONTACT_INQUIRY_STATUS_VALUES,
  CONTACT_INQUIRY_TEXT_LIMITS,
  CONTACT_INQUIRY_TYPE_LABELS,
  CONTACT_INQUIRY_TYPE_VALUES,
  CONTACT_INQUIRY_VOLUNTEER_SUBJECT_VALUES,
} from '../../../shared/domain/contactInquiryConstants.js';

const CONTACT_INQUIRY_ID_PATTERN = /^[0-9a-f]{24}$/i;
const TYPE_SPECIFIC_FIELD_LABELS = Object.freeze({
  animalName: 'животно',
  animalId: 'идентификатор на животно',
  assistanceType: 'вид помощ',
  hasRelevantExperience: 'предишен релевантен опит',
  experienceDetails: 'описание на предишния опит',
  availability: 'наличност',
  donationTopic: 'вид дарение',
});

const TYPE_SPECIFIC_FIELDS = Object.freeze({
  general: Object.freeze([]),
  adoption: Object.freeze(['animalName']),
  'special-care': Object.freeze([
    'animalName',
    'animalId',
    'assistanceType',
    'hasRelevantExperience',
    'experienceDetails',
    'availability',
  ]),
  volunteering: Object.freeze(['availability']),
  donation: Object.freeze(['donationTopic']),
});

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLookupText(value) {
  return normalizeText(value).toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getActorName(currentUser) {
  return [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() ||
    currentUser?.username ||
    '';
}

function buildStatusHistoryEntry(fromStatus, toStatus, currentUser = null) {
  return {
    fromStatus: fromStatus ?? '',
    toStatus,
    changedBy: mongoose.isValidObjectId(currentUser?.id) ? currentUser.id : null,
    changedByName: currentUser ? getActorName(currentUser) : '',
    changedAt: new Date(),
  };
}

function serializeStatusHistory(statusHistory = []) {
  if (!Array.isArray(statusHistory)) {
    return [];
  }

  return statusHistory.map((entry) => ({
    fromStatus: entry?.fromStatus ?? '',
    toStatus: entry?.toStatus ?? '',
    changedBy: serializeId(entry?.changedBy) || null,
    changedByName: entry?.changedByName ?? '',
    changedAt: normalizeDateOutput(entry?.changedAt),
  }));
}

function assertTextLength(value, fieldName, label) {
  const maxLength = CONTACT_INQUIRY_TEXT_LIMITS[fieldName];

  if (value.length > maxLength) {
    throw createHttpError(
      400,
      `${label} може да съдържа най-много ${maxLength} символа.`
    );
  }
}

function assertTypeSpecificFields(type, values) {
  const allowedFields = new Set(TYPE_SPECIFIC_FIELDS[type] ?? []);

  for (const [fieldName, label] of Object.entries(TYPE_SPECIFIC_FIELD_LABELS)) {
    const value = values[fieldName];
    const hasValue = value !== undefined && value !== null && value !== '';

    if (hasValue && !allowedFields.has(fieldName)) {
      throw createHttpError(
        400,
        `Полето „${label}“ не се прилага за избрания тип запитване.`
      );
    }
  }
}

function normalizeOptionalBoolean(value, fieldName) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw createHttpError(400, `Полето "${fieldName}" трябва да бъде boolean стойност.`);
  }

  return value;
}

function assertAllowedOption(value, allowedValues, message, detailsKey) {
  if (!allowedValues.includes(value)) {
    throw createHttpError(400, message, {
      [detailsKey]: [...allowedValues],
    });
  }
}

function assertStaffPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'contactInquiries', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function normalizeInquiryType(value) {
  const normalizedType = normalizeLookupText(value);

  if (!CONTACT_INQUIRY_TYPE_VALUES.includes(normalizedType)) {
    throw createHttpError(400, 'Избраният тип запитване е невалиден.', {
      allowedTypes: CONTACT_INQUIRY_TYPE_VALUES,
    });
  }

  return normalizedType;
}

function normalizeOptionalInquiryType(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return normalizeInquiryType(value);
}

function normalizeInquiryStatus(value, fieldName = 'status') {
  const normalizedStatus = normalizeLookupText(value);

  if (!CONTACT_INQUIRY_STATUS_VALUES.includes(normalizedStatus)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалидна стойност.`, {
      allowedStatuses: CONTACT_INQUIRY_STATUS_VALUES,
    });
  }

  return normalizedStatus;
}

function normalizeOptionalInquiryStatus(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return normalizeInquiryStatus(value);
}

function assertValidContactInquiryId(inquiryId) {
  const normalizedId = normalizeText(inquiryId);

  if (!normalizedId) {
    throw createHttpError(400, 'Липсва идентификатор на запитването.');
  }

  if (!CONTACT_INQUIRY_ID_PATTERN.test(normalizedId)) {
    throw createHttpError(400, 'Идентификаторът на запитването е в невалиден формат.');
  }

  return normalizedId;
}

function isSpecialCareAnimal(animal) {
  if (!animal || animal.status === 'released') {
    return false;
  }

  return (
    PROTECTED_CARE_SPECIES_VALUES.includes(animal.species) ||
    ['under-care', 'protected-care'].includes(animal.status)
  );
}

async function normalizeCreatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, [
    'type',
    'name',
    'email',
    'phone',
    'subject',
    'description',
    'animalId',
    'animalName',
    'assistanceType',
    'hasRelevantExperience',
    'experienceDetails',
    'availability',
    'donationTopic',
  ]);

  const type = normalizeInquiryType(payload.type);
  const name = normalizeText(payload.name);
  const email = normalizeLookupText(payload.email);
  const phone = normalizeText(payload.phone);
  const subject = normalizeText(payload.subject);
  const description = normalizeText(payload.description);
  const animalId = normalizeText(payload.animalId);
  const animalName = normalizeText(payload.animalName);
  const assistanceType = normalizeText(payload.assistanceType);
  const hasRelevantExperience = normalizeOptionalBoolean(
    payload.hasRelevantExperience,
    'hasRelevantExperience'
  );
  const experienceDetails = normalizeText(payload.experienceDetails);
  const availability = normalizeText(payload.availability);
  const donationTopic = normalizeText(payload.donationTopic);

  if (!name || !email || !description) {
    throw createHttpError(400, 'Попълни име, имейл и описание на запитването.');
  }

  if (!phone) {
    throw createHttpError(400, 'Телефонът е задължителен.');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (!isValidPhone(phone)) {
    throw createHttpError(400, 'Въведи валиден телефонен номер.');
  }

  assertTextLength(name, 'name', 'Името');
  assertTextLength(email, 'email', 'Имейлът');
  assertTextLength(phone, 'phone', 'Телефонът');
  assertTextLength(subject, 'subject', 'Темата');
  assertTextLength(description, 'description', 'Описанието');
  assertTextLength(animalName, 'animalName', 'Името на животното');
  assertTextLength(experienceDetails, 'experienceDetails', 'Описанието на опита');
  assertTextLength(availability, 'availability', 'Наличността');
  assertTextLength(donationTopic, 'donationTopic', 'Видът дарение');

  assertTypeSpecificFields(type, {
    animalName,
    animalId,
    assistanceType,
    hasRelevantExperience,
    experienceDetails,
    availability,
    donationTopic,
  });

  if (type === 'general' && !subject) {
    throw createHttpError(400, 'Темата е задължителна.');
  }

  if (type === 'adoption' && (!animalName || !subject)) {
    throw createHttpError(
      400,
      'За запитване относно осиновяване са задължителни животно и тип въпрос.'
    );
  }

  if (type === 'adoption') {
    assertAllowedOption(
      subject,
      CONTACT_INQUIRY_ADOPTION_SUBJECT_VALUES,
      'Избраният тип въпрос за осиновяване е невалиден.',
      'allowedSubjects'
    );
  }

  if (type === 'special-care' && (!animalId || !subject)) {
    throw createHttpError(
      400,
      'За запитване относно специална грижа са задължителни животно и тип запитване.'
    );
  }

  if (type === 'special-care') {
    assertAllowedOption(
      subject,
      CONTACT_INQUIRY_SPECIAL_CARE_SUBJECT_VALUES,
      'Избраният тип запитване за специалната заявка е невалиден.',
      'allowedSubjects'
    );

    if (subject === 'special-request') {
      if (!assistanceType || hasRelevantExperience === undefined || !availability) {
        throw createHttpError(
          400,
          'За специална заявка са задължителни вид помощ, отговор за предишен опит и наличност.'
        );
      }

      assertAllowedOption(
        assistanceType,
        CONTACT_INQUIRY_SPECIAL_CARE_ASSISTANCE_TYPE_VALUES,
        'Избраният вид помощ е невалиден.',
        'allowedAssistanceTypes'
      );

      if (hasRelevantExperience && !experienceDetails) {
        throw createHttpError(400, 'Опиши накратко предишния си релевантен опит.');
      }

      if (!hasRelevantExperience && experienceDetails) {
        throw createHttpError(400, 'Описание на опита не се подава при отговор „Не“.');
      }

      assertAllowedOption(
        availability,
        CONTACT_INQUIRY_SPECIAL_CARE_AVAILABILITY_VALUES,
        'Избраната наличност е невалидна.',
        'allowedAvailabilityValues'
      );
    } else if (
      assistanceType ||
      hasRelevantExperience !== undefined ||
      experienceDetails ||
      availability
    ) {
      throw createHttpError(
        400,
        'Данни за предлагана помощ се подават само при тема „Специална заявка“.'
      );
    }
  }

  if (type === 'volunteering' && (!availability || !subject)) {
    throw createHttpError(
      400,
      'За доброволческо запитване са задължителни наличност и дейност.'
    );
  }

  if (type === 'volunteering') {
    assertAllowedOption(
      subject,
      CONTACT_INQUIRY_VOLUNTEER_SUBJECT_VALUES,
      'Избраната доброволческа дейност е невалидна.',
      'allowedSubjects'
    );
  }

  if (type === 'donation' && (!donationTopic || !subject)) {
    throw createHttpError(
      400,
      'За запитване относно дарение са задължителни вид дарение и тема.'
    );
  }

  if (type === 'donation') {
    assertAllowedOption(
      donationTopic,
      CONTACT_INQUIRY_DONATION_TOPIC_VALUES,
      'Избраният вид дарение е невалиден.',
      'allowedDonationTopics'
    );
  }

  const normalizedPayload = {
    type,
    name,
    email,
    phone,
    subject,
    description,
    status: 'pending',
    resolvedAt: null,
    statusHistory: [buildStatusHistoryEntry('', 'pending')],
  };

  if (type === 'adoption') {
    normalizedPayload.animalName = animalName;
  }

  if (type === 'special-care') {
    const animalReference = await getAnimalReferenceById(animalId, null, {
      restrictToPublicAnimal: true,
      publicVisibility: 'detail',
    });

    if (!animalReference) {
      throw createHttpError(404, 'Животното не е намерено или не е достъпно публично.');
    }

    if (!isSpecialCareAnimal(animalReference.item)) {
      throw createHttpError(
        409,
        'Специално запитване може да бъде подадено само за животно под специална или защитена грижа.'
      );
    }

    normalizedPayload.animal = animalReference.databaseId;
    normalizedPayload.animalName =
      animalReference.item.displayName || animalReference.item.name || 'Животно';
    if (subject === 'special-request') {
      normalizedPayload.assistanceType = assistanceType;
      normalizedPayload.hasRelevantExperience = hasRelevantExperience;

      if (experienceDetails) {
        normalizedPayload.experienceDetails = experienceDetails;
      }

      normalizedPayload.availability = availability;
    }
  }

  if (type === 'volunteering') {
    normalizedPayload.availability = availability;
  }

  if (type === 'donation') {
    normalizedPayload.donationTopic = donationTopic;
  }

  return normalizedPayload;
}

function normalizeStatusUpdatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['status']);

  return {
    status: normalizeInquiryStatus(payload.status),
  };
}

function serializeContactInquiry(inquiry) {
  const type = inquiry.type ?? 'general';
  const status = inquiry.status ?? 'pending';

  return {
    id: serializeId(inquiry),
    type,
    typeLabel: CONTACT_INQUIRY_TYPE_LABELS[type] ?? type,
    name: inquiry.name ?? '',
    email: inquiry.email ?? '',
    phone: inquiry.phone ?? '',
    subject: inquiry.subject ?? '',
    description: inquiry.description ?? '',
    animalName: inquiry.animalName ?? '',
    animalId: serializeId(inquiry.animal) || null,
    assistanceType: inquiry.assistanceType ?? '',
    hasRelevantExperience:
      typeof inquiry.hasRelevantExperience === 'boolean'
        ? inquiry.hasRelevantExperience
        : null,
    experienceDetails: inquiry.experienceDetails ?? '',
    availability: inquiry.availability ?? '',
    donationTopic: inquiry.donationTopic ?? '',
    status,
    statusLabel: CONTACT_INQUIRY_STATUS_LABELS[status] ?? status,
    allowedStatusTransitions: [...(CONTACT_INQUIRY_STATUS_TRANSITIONS[status] ?? [])],
    statusHistory: serializeStatusHistory(inquiry.statusHistory),
    resolvedAt: normalizeDateOutput(inquiry.resolvedAt),
    createdAt: normalizeDateOutput(inquiry.createdAt),
    updatedAt: normalizeDateOutput(inquiry.updatedAt),
  };
}

function serializePublicContactInquirySubmission(inquiry) {
  const type = inquiry.type ?? 'general';
  const status = inquiry.status ?? 'pending';

  return {
    id: serializeId(inquiry),
    type,
    typeLabel: CONTACT_INQUIRY_TYPE_LABELS[type] ?? type,
    status,
    statusLabel: CONTACT_INQUIRY_STATUS_LABELS[status] ?? status,
    createdAt: normalizeDateOutput(inquiry.createdAt),
  };
}

function serializeContactInquiryListItem(inquiry) {
  const type = inquiry.type ?? 'general';
  const status = inquiry.status ?? 'pending';

  return {
    id: serializeId(inquiry),
    type,
    typeLabel: CONTACT_INQUIRY_TYPE_LABELS[type] ?? type,
    name: inquiry.name ?? '',
    email: inquiry.email ?? '',
    phone: inquiry.phone ?? '',
    subject: inquiry.subject ?? '',
    status,
    statusLabel: CONTACT_INQUIRY_STATUS_LABELS[status] ?? status,
    createdAt: normalizeDateOutput(inquiry.createdAt),
  };
}

function buildContactInquiryQuery(filters = {}) {
  const query = {};
  const type = normalizeOptionalInquiryType(filters.type);
  const status = normalizeOptionalInquiryStatus(filters.status);
  const search = normalizeLookupText(filters.search);

  if (type) {
    query.type = type;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { subject: regex },
      { description: regex },
      { animalName: regex },
      { availability: regex },
      { donationTopic: regex },
    ];
  }

  return query;
}

function assertAllowedContactInquiryStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    throw createHttpError(409, 'Запитването вече е с този статус.');
  }

  const allowedTransitions = CONTACT_INQUIRY_STATUS_TRANSITIONS[currentStatus] ?? [];

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

async function findContactInquiryRecordById(inquiryId) {
  const normalizedId = assertValidContactInquiryId(inquiryId);

  if (!mongoose.isValidObjectId(normalizedId)) {
    return null;
  }

  return ContactInquiry.findById(normalizedId).lean();
}

export async function createContactInquiry(payload) {
  const normalizedPayload = await normalizeCreatePayload(payload);
  const createdInquiry = await ContactInquiry.create(normalizedPayload);
  const createdInquiryObject = createdInquiry.toObject();
  const serializedInquiry = serializePublicContactInquirySubmission(createdInquiryObject);
  const typeLabel = CONTACT_INQUIRY_TYPE_LABELS[serializedInquiry.type] ?? 'запитване';

  try {
    await notifyOperationalStaff({
      type: 'contact-inquiry-created',
      title: 'Ново контактно запитване',
      message: `Получено е ново запитване: ${typeLabel}.`,
      resourceId: serializedInquiry.id,
    });
  } catch (error) {
    console.error('[contact-inquiries] contact-inquiry-created notification failed', error);
  }

  return serializedInquiry;
}

export async function getContactInquiryCollection(currentUser, filters = {}) {
  assertStaffPermission(currentUser, 'view-all');
  const query = buildContactInquiryQuery(filters);
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: 10,
    maxLimit: 50,
  });
  const total = await ContactInquiry.countDocuments(query);
  const pagination = buildPagination(total, paginationOptions);
  const inquiries = await readWorkflowCollectionPage({
    model: ContactInquiry,
    query,
    pagination,
    statusTransitions: CONTACT_INQUIRY_STATUS_TRANSITIONS,
    configureQuery: (inquiryQuery) =>
      inquiryQuery.select('type name email phone subject status createdAt'),
  });

  return {
    items: inquiries.map(serializeContactInquiryListItem),
    total,
    pagination,
  };
}

export async function getContactInquiryById(inquiryId, currentUser) {
  assertStaffPermission(currentUser, 'detail');
  const inquiry = await findContactInquiryRecordById(inquiryId);

  if (!inquiry) {
    throw createHttpError(404, 'Запитването не беше намерено.');
  }

  return serializeContactInquiry(inquiry);
}

export async function updateContactInquiryStatus(inquiryId, payload, currentUser) {
  assertStaffPermission(currentUser, 'update-status');
  const normalizedId = assertValidContactInquiryId(inquiryId);
  const normalizedPayload = normalizeStatusUpdatePayload(payload);
  const inquiry = await findContactInquiryRecordById(normalizedId);

  if (!inquiry) {
    throw createHttpError(404, 'Запитването не беше намерено.');
  }

  const currentStatus = inquiry.status ?? 'pending';
  assertAllowedContactInquiryStatusTransition(currentStatus, normalizedPayload.status);
  const statusHistoryEntry = buildStatusHistoryEntry(
    currentStatus,
    normalizedPayload.status,
    currentUser
  );

  const updatedInquiry = await ContactInquiry.findOneAndUpdate(
    {
      _id: normalizedId,
      status: currentStatus,
    },
    {
      $set: {
        status: normalizedPayload.status,
        ...(normalizedPayload.status === 'resolved'
          ? { resolvedAt: statusHistoryEntry.changedAt }
          : {}),
      },
      $push: {
        statusHistory: statusHistoryEntry,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  ).lean();

  if (!updatedInquiry) {
    throw createHttpError(409, 'Статусът на запитването беше променен преди записването на заявката.', {
      currentStatus,
      requestedStatus: normalizedPayload.status,
    });
  }

  return serializeContactInquiry(updatedInquiry);
}
