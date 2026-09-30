import mongoose from 'mongoose';

import RescueReport from '../../models/RescueReport.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { readWorkflowCollectionPage } from '../../utils/workflowList.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { normalizeDateOutput, serializeId } from '../../utils/serialization.js';
import { parseBase64DataUrl } from '../../utils/dataUrl.js';
import { EMAIL_PATTERN } from '../../../shared/domain/userConstants.js';
import { isValidPhone } from '../../../shared/domain/contactValidation.js';
import { hasPermission } from '../shared/rolePolicies.js';
import { notifyOperationalStaff } from '../notifications/notifications.service.js';
import {
  RESCUE_REPORT_IMAGE_MAX_BYTES,
  RESCUE_REPORT_IMAGE_MIME_TYPES,
  RESCUE_REPORT_SPECIES_LABELS,
  RESCUE_REPORT_SPECIES_VALUES,
  RESCUE_REPORT_STATUS_LABELS,
  RESCUE_REPORT_STATUS_TRANSITIONS,
  RESCUE_REPORT_STATUS_VALUES,
  RESCUE_REPORT_TEXT_LIMITS,
  RESCUE_REPORT_URGENCY_LABELS,
  RESCUE_REPORT_URGENCY_VALUES,
} from '../../../shared/domain/rescueReportConstants.js';

const RESCUE_REPORT_ID_PATTERN = /^[0-9a-f]{24}$/i;

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

  if (!hasPermission(currentUser.role, 'rescueReports', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function normalizeReportStatus(value, fieldName = 'status') {
  const normalizedStatus = normalizeLookupText(value);

  if (!RESCUE_REPORT_STATUS_VALUES.includes(normalizedStatus)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалидна стойност.`, {
      allowedStatuses: RESCUE_REPORT_STATUS_VALUES,
    });
  }

  return normalizedStatus;
}

function normalizeOptionalReportStatus(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return normalizeReportStatus(value);
}

function normalizeReportUrgency(value) {
  const normalizedUrgency = normalizeLookupText(value);

  if (!RESCUE_REPORT_URGENCY_VALUES.includes(normalizedUrgency)) {
    throw createHttpError(400, 'Полето "urgency" съдържа невалидна стойност.', {
      allowedUrgencies: RESCUE_REPORT_URGENCY_VALUES,
    });
  }

  return normalizedUrgency;
}

function normalizeOptionalReportUrgency(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return normalizeReportUrgency(value);
}

function normalizeReportSpecies(value) {
  const normalizedSpecies = normalizeLookupText(value);

  if (!RESCUE_REPORT_SPECIES_VALUES.includes(normalizedSpecies)) {
    throw createHttpError(400, 'Полето "species" съдържа невалидна стойност.', {
      allowedSpecies: RESCUE_REPORT_SPECIES_VALUES,
    });
  }

  return normalizedSpecies;
}

function normalizeOptionalReportSpecies(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return normalizeReportSpecies(value);
}

function normalizeOptionalImageUrl(value) {
  const imageUrl = normalizeText(value);

  if (!imageUrl) {
    return '';
  }

  const parsedImage = parseBase64DataUrl(imageUrl);

  if (!parsedImage || !RESCUE_REPORT_IMAGE_MIME_TYPES.includes(parsedImage.mimeType)) {
    throw createHttpError(400, 'Снимката трябва да бъде JPEG, PNG или WebP файл.');
  }

  if (parsedImage.byteLength > RESCUE_REPORT_IMAGE_MAX_BYTES) {
    throw createHttpError(400, 'Снимката трябва да бъде до 4 MB.');
  }

  return imageUrl;
}

function assertValidRescueReportId(reportId) {
  const normalizedId = normalizeText(reportId);

  if (!normalizedId) {
    throw createHttpError(400, 'Липсва идентификатор на сигнала.');
  }

  if (!RESCUE_REPORT_ID_PATTERN.test(normalizedId)) {
    throw createHttpError(400, 'Идентификаторът на сигнала е в невалиден формат.');
  }

  return normalizedId;
}

function normalizeCreatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['name', 'email', 'phone', 'location', 'species', 'urgency', 'description', 'imageUrl']);

  const name = normalizeLimitedText(payload.name, 'name', RESCUE_REPORT_TEXT_LIMITS.name);
  const email = normalizeLimitedText(
    normalizeLookupText(payload.email),
    'email',
    RESCUE_REPORT_TEXT_LIMITS.email
  );
  const phone = normalizeLimitedText(payload.phone, 'phone', RESCUE_REPORT_TEXT_LIMITS.phone);
  const location = normalizeLimitedText(
    payload.location,
    'location',
    RESCUE_REPORT_TEXT_LIMITS.location
  );
  const species = normalizeReportSpecies(payload.species);
  const urgency = normalizeReportUrgency(payload.urgency);
  const description = normalizeLimitedText(
    payload.description,
    'description',
    RESCUE_REPORT_TEXT_LIMITS.description
  );
  const imageUrl = normalizeOptionalImageUrl(payload.imageUrl);

  if (!name || !email || !phone || !location || !description) {
    throw createHttpError(400, 'Попълни всички задължителни полета на сигнала.');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (!isValidPhone(phone)) {
    throw createHttpError(400, 'Въведи валиден телефонен номер.');
  }

  return {
    name,
    email,
    phone,
    location,
    species,
    urgency,
    description,
    imageUrl,
  };
}

function normalizeReviewPayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['status', 'notes']);

  const normalizedPayload = {};

  if (payload.status !== undefined && payload.status !== null && payload.status !== '') {
    normalizedPayload.status = normalizeReportStatus(payload.status);
  }

  if (payload.notes !== undefined) {
    normalizedPayload.notes = normalizeLimitedText(
      payload.notes,
      'notes',
      RESCUE_REPORT_TEXT_LIMITS.internalNote
    );
  }

  if (normalizedPayload.status === undefined && normalizedPayload.notes === undefined) {
    throw createHttpError(400, 'Подай нов статус или вътрешна бележка.');
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

function serializeInternalNotes(internalNotes = []) {
  const notes = Array.isArray(internalNotes) ? internalNotes : [];
  const serializedNotes = notes.map((note) => ({
    text: note.text ?? '',
    authorId: serializeId(note.author),
    authorName: note.authorName ?? '',
    createdAt: normalizeDateOutput(note.createdAt),
  }));

  return serializedNotes;
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

function serializeRescueReport(report) {
  const species = report.species ?? 'other';
  const urgency = report.urgency ?? 'medium';
  const status = report.status ?? 'pending';

  return {
    id: serializeId(report),
    name: report.name ?? '',
    email: report.email ?? '',
    phone: report.phone ?? '',
    location: report.location ?? '',
    species,
    speciesLabel: RESCUE_REPORT_SPECIES_LABELS[species] ?? species,
    urgency,
    urgencyLabel: RESCUE_REPORT_URGENCY_LABELS[urgency] ?? urgency,
    description: report.description ?? '',
    imageUrl: report.imageUrl ?? '',
    status,
    statusLabel: RESCUE_REPORT_STATUS_LABELS[status] ?? status,
    allowedStatusTransitions: RESCUE_REPORT_STATUS_TRANSITIONS[status] ?? [],
    internalNotes: serializeInternalNotes(report.internalNotes),
    statusHistory: serializeStatusHistory(report.statusHistory),
    createdAt: normalizeDateOutput(report.createdAt),
    updatedAt: normalizeDateOutput(report.updatedAt),
  };
}

function serializePublicRescueReportSubmission(report) {
  const urgency = report.urgency ?? 'medium';
  const status = report.status ?? 'pending';

  return {
    id: serializeId(report),
    name: report.name ?? '',
    status,
    statusLabel: RESCUE_REPORT_STATUS_LABELS[status] ?? status,
    urgency,
    createdAt: normalizeDateOutput(report.createdAt),
  };
}

function assertAllowedRescueReportStatusTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus || currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = RESCUE_REPORT_STATUS_TRANSITIONS[currentStatus] ?? [];

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

function serializeRescueReportListItem(report) {
  const species = report.species ?? 'other';
  const urgency = report.urgency ?? 'medium';
  const status = report.status ?? 'pending';

  return {
    id: serializeId(report),
    name: report.name ?? '',
    phone: report.phone ?? '',
    location: report.location ?? '',
    species,
    speciesLabel: RESCUE_REPORT_SPECIES_LABELS[species] ?? species,
    urgency,
    urgencyLabel: RESCUE_REPORT_URGENCY_LABELS[urgency] ?? urgency,
    status,
    statusLabel: RESCUE_REPORT_STATUS_LABELS[status] ?? status,
    createdAt: normalizeDateOutput(report.createdAt),
  };
}

function buildRescueReportQuery(filters = {}) {
  const query = {};
  const status = normalizeOptionalReportStatus(filters.status);
  const urgency = normalizeOptionalReportUrgency(filters.urgency);
  const species = normalizeOptionalReportSpecies(filters.species);
  const search = normalizeLookupText(filters.search);

  if (status) {
    query.status = status;
  }

  if (urgency) {
    query.urgency = urgency;
  }

  if (species) {
    query.species = species;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { location: regex },
      { description: regex },
    ];
  }

  return query;
}

async function findRescueReportRecordById(reportId) {
  const normalizedId = assertValidRescueReportId(reportId);

  if (!mongoose.isValidObjectId(normalizedId)) {
    return null;
  }

  return RescueReport.findById(normalizedId).lean();
}

export async function createRescueReport(payload) {
  const normalizedPayload = normalizeCreatePayload(payload);
  const createdReport = await RescueReport.create({
    ...normalizedPayload,
    status: 'pending',
    statusHistory: [buildStatusHistoryEntry('', 'pending', null)],
  });
  const createdReportObject = createdReport.toObject();
  const serializedReport = serializeRescueReport(createdReportObject);
  const urgencyLabel = RESCUE_REPORT_URGENCY_LABELS[serializedReport.urgency] ?? serializedReport.urgency;
  const isUrgent = ['high', 'critical'].includes(serializedReport.urgency);

  try {
    await notifyOperationalStaff({
      type: 'rescue-report-created',
      title: isUrgent ? `Нов сигнал с ${urgencyLabel.toLowerCase()} спешност` : 'Нов сигнал за животно',
      message: `Получен е сигнал със спешност "${urgencyLabel}"${serializedReport.location ? ` на място: ${serializedReport.location}` : ''}.`,
      resourceId: serializedReport.id,
    });
  } catch (error) {
    console.error('[rescue-reports] rescue-report-created notification failed', error);
  }

  return serializePublicRescueReportSubmission(createdReportObject);
}

export async function getRescueReportCollection(currentUser, filters = {}) {
  assertStaffPermission(currentUser, 'view-all');
  const query = buildRescueReportQuery(filters);
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: 10,
    maxLimit: 50,
  });
  const total = await RescueReport.countDocuments(query);
  const pagination = buildPagination(total, paginationOptions);
  const reports = await readWorkflowCollectionPage({
    model: RescueReport,
    query,
    pagination,
    statusTransitions: RESCUE_REPORT_STATUS_TRANSITIONS,
    configureQuery: (reportQuery) =>
      reportQuery.select('name phone location species urgency status createdAt'),
  });

  return {
    items: reports.map(serializeRescueReportListItem),
    total,
    pagination,
  };
}

export async function getRescueReportById(reportId, currentUser) {
  assertStaffPermission(currentUser, 'detail');
  const report = await findRescueReportRecordById(reportId);

  if (!report) {
    throw createHttpError(404, 'Сигналът не беше намерен.');
  }

  return serializeRescueReport(report);
}

export async function updateRescueReportReview(reportId, payload, currentUser) {
  assertStaffPermission(currentUser, 'review');
  const normalizedId = assertValidRescueReportId(reportId);
  const normalizedPayload = normalizeReviewPayload(payload);
  const report = await findRescueReportRecordById(normalizedId);

  if (!report) {
    throw createHttpError(404, 'Сигналът не беше намерен.');
  }

  const currentStatus = report.status ?? 'pending';
  const nextStatus = normalizedPayload.status ?? currentStatus;
  assertAllowedRescueReportStatusTransition(currentStatus, nextStatus);
  const internalNote = buildInternalNote(normalizedPayload.notes, currentUser);
  const statusHistoryEntry = buildStatusHistoryEntry(currentStatus, nextStatus, currentUser);
  const updatePayload = {};

  if (statusHistoryEntry) {
    updatePayload.$set = {
      status: nextStatus,
    };
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

  if (Object.keys(updatePayload).length === 0) {
    throw createHttpError(400, 'Няма промени за запис по сигнала.');
  }

  const updatedReport = await RescueReport.findOneAndUpdate(
    {
      _id: normalizedId,
      status: currentStatus,
    },
    updatePayload,
    {
      returnDocument: 'after',
      runValidators: true,
    }
  ).lean();

  if (!updatedReport) {
    throw createHttpError(
      409,
      'Статусът на сигнала беше променен преди записването на заявката.',
      {
        currentStatus,
        requestedStatus: nextStatus,
      }
    );
  }

  return serializeRescueReport(updatedReport);
}
