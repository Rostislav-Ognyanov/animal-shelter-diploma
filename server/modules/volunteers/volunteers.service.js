import crypto from 'node:crypto';

import mongoose from 'mongoose';

import { isDatabaseConnected } from '../../config/db.js';
import VolunteerApplication from '../../models/VolunteerApplication.js';
import { createHttpError } from '../../utils/httpError.js';
import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { saveJsonFile } from '../../utils/saveJsonFile.js';
import {
  getAllowedVolunteerApplicationActions,
  hasPermission,
} from '../shared/rolePolicies.js';
import {
  VOLUNTEER_APPLICATION_STATUS_LABELS,
  VOLUNTEER_APPLICATION_STATUS_VALUES,
  VOLUNTEER_POSITION_LABELS,
  VOLUNTEER_POSITION_VALUES,
} from './volunteer.constants.js';

const VOLUNTEER_APPLICATIONS_DATA_PATH = 'data/volunteer-applications.json';
const VOLUNTEER_APPLICATION_ID_PATTERN =
  /^[0-9a-f]{24}$|^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\s().-]{6,32}$/;

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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  if (!Number.isInteger(numericValue) || numericValue <= 0 || numericValue > 120) {
    throw createHttpError(400, 'Полето "age" трябва да бъде валидна възраст.');
  }

  return numericValue;
}

function parseGuardianConsent(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes' || normalizedValue === 'on';
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return false;
}

function isValidGuardianContact(value) {
  return EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value);
}

function normalizeVolunteerStatus(value, fieldName = 'status') {
  const normalizedStatus = normalizeLookupText(value);

  if (!VOLUNTEER_APPLICATION_STATUS_VALUES.includes(normalizedStatus)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалидна стойност.`, {
      allowedStatuses: VOLUNTEER_APPLICATION_STATUS_VALUES,
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
    'guardianConsent',
    'guardianName',
    'guardianContact',
    'preferredPositions',
    'otherPosition',
    'motivation',
    'experience',
    'availability',
  ]);

  const firstName = normalizeText(payload.firstName);
  const lastName = normalizeText(payload.lastName);
  const email = normalizeLookupText(payload.email);
  const phone = normalizeText(payload.phone);
  const age = parseVolunteerAge(payload.age);
  const guardianConsent = parseGuardianConsent(payload.guardianConsent);
  const guardianName = normalizeText(payload.guardianName);
  const guardianContact = normalizeText(payload.guardianContact);
  const preferredPositions = normalizeVolunteerPositions(payload.preferredPositions);
  const otherPosition = normalizeText(payload.otherPosition);
  const motivation = normalizeText(payload.motivation);
  const experience = normalizeText(payload.experience);
  const availability = normalizeText(payload.availability);
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

  if (!PHONE_PATTERN.test(phone)) {
    throw createHttpError(400, 'Въведи валиден телефонен номер.');
  }

  if (preferredPositions.length === 0) {
    throw createHttpError(400, 'Избери поне една доброволческа позиция.');
  }

  if (preferredPositions.includes('other') && !otherPosition) {
    throw createHttpError(400, 'Попълни полето "Друго", когато е избрана тази позиция.');
  }

  if (isMinor) {
    if (!guardianConsent) {
      throw createHttpError(400, 'За кандидат под 18 години е необходимо съгласие от родител или настойник.');
    }

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
    guardianConsent: isMinor ? guardianConsent : false,
    guardianName: isMinor ? guardianName : '',
    guardianContact: isMinor ? guardianContact : '',
    preferredPositions,
    otherPosition: preferredPositions.includes('other') ? otherPosition : '',
    motivation,
    experience,
    availability,
  };
}

function normalizeStatusUpdatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['status', 'notes']);

  return {
    status: normalizeVolunteerStatus(payload.status),
    notes: normalizeText(payload.notes),
  };
}

function serializeVolunteerApplication(application) {
  const preferredPositions = Array.isArray(application.preferredPositions)
    ? application.preferredPositions.map((position) => String(position))
    : [];

  return {
    id: serializeId(application),
    firstName: application.firstName ?? '',
    lastName: application.lastName ?? '',
    email: application.email ?? '',
    phone: application.phone ?? '',
    age: application.age ?? null,
    guardianConsent: Boolean(application.guardianConsent),
    guardianName: application.guardianName ?? '',
    guardianContact: application.guardianContact ?? '',
    preferredPositions,
    preferredPositionLabels: getVolunteerPositionLabels(preferredPositions),
    otherPosition: application.otherPosition ?? '',
    motivation: application.motivation ?? '',
    experience: application.experience ?? '',
    availability: application.availability ?? '',
    status: application.status ?? 'pending',
    statusLabel:
      VOLUNTEER_APPLICATION_STATUS_LABELS[application.status] ?? application.status ?? 'В очакване',
    notes: application.notes ?? '',
    createdAt: normalizeDateOutput(application.createdAt),
    updatedAt: normalizeDateOutput(application.updatedAt),
  };
}

async function readMockVolunteerApplications() {
  return loadJsonFile(VOLUNTEER_APPLICATIONS_DATA_PATH);
}

async function writeMockVolunteerApplications(applications) {
  return saveJsonFile(VOLUNTEER_APPLICATIONS_DATA_PATH, applications);
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

function applyVolunteerFilters(applications, filters = {}) {
  const status = normalizeOptionalVolunteerStatus(filters.status);
  const search = normalizeLookupText(filters.search);

  return applications.filter((application) => {
    const matchesStatus = !status || application.status === status;
    const matchesSearch =
      !search ||
      [
        application.firstName,
        application.lastName,
        application.email,
        application.phone,
        application.guardianName,
        application.guardianContact,
        application.otherPosition,
      ]
        .map((entry) => normalizeLookupText(entry))
        .some((entry) => entry.includes(search));

    return matchesStatus && matchesSearch;
  });
}

function sortApplicationsByNewest(applications) {
  return [...applications].sort((leftApplication, rightApplication) => {
    const leftCreatedAt = new Date(leftApplication.createdAt ?? 0).getTime();
    const rightCreatedAt = new Date(rightApplication.createdAt ?? 0).getTime();
    return rightCreatedAt - leftCreatedAt;
  });
}

async function findVolunteerApplicationRecordById(applicationId) {
  const normalizedId = assertValidVolunteerApplicationId(applicationId);

  if (isDatabaseConnected()) {
    if (!mongoose.isValidObjectId(normalizedId)) {
      return null;
    }

    return VolunteerApplication.findById(normalizedId).lean();
  }

  const applications = await readMockVolunteerApplications();
  return applications.find((entry) => entry.id === normalizedId) ?? null;
}

export function getVolunteerApplicationModulePolicy(roleCandidate) {
  return {
    resource: 'volunteers',
    allowedActions: getAllowedVolunteerApplicationActions(roleCandidate),
    statuses: VOLUNTEER_APPLICATION_STATUS_VALUES,
  };
}

export async function createVolunteerApplication(payload) {
  const normalizedPayload = normalizeCreatePayload(payload);

  if (isDatabaseConnected()) {
    const createdApplication = await VolunteerApplication.create({
      ...normalizedPayload,
      status: 'pending',
      notes: '',
    });

    return serializeVolunteerApplication(createdApplication.toObject());
  }

  const applications = await readMockVolunteerApplications();
  const now = new Date().toISOString();
  const applicationRecord = {
    id: crypto.randomUUID(),
    ...normalizedPayload,
    status: 'pending',
    notes: '',
    createdAt: now,
    updatedAt: now,
  };

  applications.push(applicationRecord);
  await writeMockVolunteerApplications(applications);

  return serializeVolunteerApplication(applicationRecord);
}

export async function getVolunteerApplicationCollection(currentUser, filters = {}) {
  assertStaffPermission(currentUser, 'view-all');

  if (isDatabaseConnected()) {
    const applications = await VolunteerApplication.find(buildVolunteerQuery(filters))
      .sort({ createdAt: -1 })
      .lean();

    return applications.map(serializeVolunteerApplication);
  }

  const applications = await readMockVolunteerApplications();
  return sortApplicationsByNewest(applyVolunteerFilters(applications, filters)).map(
    serializeVolunteerApplication
  );
}

export async function getVolunteerApplicationById(applicationId, currentUser) {
  assertStaffPermission(currentUser, 'detail');
  const application = await findVolunteerApplicationRecordById(applicationId);

  if (!application) {
    throw createHttpError(404, 'Кандидатурата не беше намерена.');
  }

  return serializeVolunteerApplication(application);
}

export async function updateVolunteerApplicationStatus(applicationId, payload, currentUser) {
  assertStaffPermission(currentUser, 'update-status');
  const normalizedId = assertValidVolunteerApplicationId(applicationId);
  const normalizedPayload = normalizeStatusUpdatePayload(payload);

  if (isDatabaseConnected()) {
    const updatedApplication = await VolunteerApplication.findByIdAndUpdate(
      normalizedId,
      {
        status: normalizedPayload.status,
        notes: normalizedPayload.notes,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedApplication) {
      throw createHttpError(404, 'Кандидатурата не беше намерена.');
    }

    return serializeVolunteerApplication(updatedApplication);
  }

  const applications = await readMockVolunteerApplications();
  const applicationIndex = applications.findIndex((entry) => entry.id === normalizedId);

  if (applicationIndex === -1) {
    throw createHttpError(404, 'Кандидатурата не беше намерена.');
  }

  const updatedApplication = {
    ...applications[applicationIndex],
    status: normalizedPayload.status,
    notes: normalizedPayload.notes,
    updatedAt: new Date().toISOString(),
  };

  applications[applicationIndex] = updatedApplication;
  await writeMockVolunteerApplications(applications);

  return serializeVolunteerApplication(updatedApplication);
}
