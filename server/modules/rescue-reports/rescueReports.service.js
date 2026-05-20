import crypto from 'node:crypto';

import mongoose from 'mongoose';

import { isDatabaseConnected } from '../../config/db.js';
import RescueReport from '../../models/RescueReport.js';
import { createHttpError } from '../../utils/httpError.js';
import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { saveJsonFile } from '../../utils/saveJsonFile.js';
import {
  getAllowedRescueReportActions,
  hasPermission,
} from '../shared/rolePolicies.js';
import {
  RESCUE_REPORT_SPECIES_LABELS,
  RESCUE_REPORT_SPECIES_VALUES,
  RESCUE_REPORT_STATUS_LABELS,
  RESCUE_REPORT_STATUS_VALUES,
  RESCUE_REPORT_URGENCY_LABELS,
  RESCUE_REPORT_URGENCY_VALUES,
} from './rescueReport.constants.js';

const RESCUE_REPORTS_DATA_PATH = 'data/rescue-reports.json';
const RESCUE_REPORT_ID_PATTERN =
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

function normalizeReportSpecies(value) {
  const normalizedSpecies = normalizeLookupText(value);

  if (!RESCUE_REPORT_SPECIES_VALUES.includes(normalizedSpecies)) {
    throw createHttpError(400, 'Полето "species" съдържа невалидна стойност.', {
      allowedSpecies: RESCUE_REPORT_SPECIES_VALUES,
    });
  }

  return normalizedSpecies;
}

function normalizeOptionalImageUrl(value) {
  const imageUrl = normalizeText(value);

  if (!imageUrl) {
    return '';
  }

  if (imageUrl.length > 6_000_000) {
    throw createHttpError(400, 'Качената снимка е твърде голяма за изпращане.');
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

  const name = normalizeText(payload.name);
  const email = normalizeLookupText(payload.email);
  const phone = normalizeText(payload.phone);
  const location = normalizeText(payload.location);
  const species = normalizeReportSpecies(payload.species);
  const urgency = normalizeReportUrgency(payload.urgency);
  const description = normalizeText(payload.description);
  const imageUrl = normalizeOptionalImageUrl(payload.imageUrl);

  if (!name || !email || !phone || !location || !description) {
    throw createHttpError(400, 'Попълни всички задължителни полета на сигнала.');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (!PHONE_PATTERN.test(phone)) {
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

function normalizeStatusUpdatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['status', 'notes']);

  return {
    status: normalizeReportStatus(payload.status),
    notes: normalizeText(payload.notes),
  };
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
    notes: report.notes ?? '',
    createdAt: normalizeDateOutput(report.createdAt),
    updatedAt: normalizeDateOutput(report.updatedAt),
  };
}

async function readMockRescueReports() {
  return loadJsonFile(RESCUE_REPORTS_DATA_PATH);
}

async function writeMockRescueReports(reports) {
  return saveJsonFile(RESCUE_REPORTS_DATA_PATH, reports);
}

function buildRescueReportQuery(filters = {}) {
  const query = {};
  const status = normalizeOptionalReportStatus(filters.status);
  const search = normalizeLookupText(filters.search);

  if (status) {
    query.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { name: regex },
      { phone: regex },
      { location: regex },
      { description: regex },
    ];
  }

  return query;
}

function applyRescueReportFilters(reports, filters = {}) {
  const status = normalizeOptionalReportStatus(filters.status);
  const search = normalizeLookupText(filters.search);

  return reports.filter((report) => {
    const matchesStatus = !status || report.status === status;
    const matchesSearch =
      !search ||
      [report.name, report.phone, report.location, report.description]
        .map((entry) => normalizeLookupText(entry))
        .some((entry) => entry.includes(search));

    return matchesStatus && matchesSearch;
  });
}

function sortReportsByNewest(reports) {
  return [...reports].sort((leftReport, rightReport) => {
    const leftCreatedAt = new Date(leftReport.createdAt ?? 0).getTime();
    const rightCreatedAt = new Date(rightReport.createdAt ?? 0).getTime();
    return rightCreatedAt - leftCreatedAt;
  });
}

async function findRescueReportRecordById(reportId) {
  const normalizedId = assertValidRescueReportId(reportId);

  if (isDatabaseConnected()) {
    if (!mongoose.isValidObjectId(normalizedId)) {
      return null;
    }

    return RescueReport.findById(normalizedId).lean();
  }

  const reports = await readMockRescueReports();
  return reports.find((entry) => entry.id === normalizedId) ?? null;
}

export function getRescueReportModulePolicy(roleCandidate) {
  return {
    resource: 'rescueReports',
    allowedActions: getAllowedRescueReportActions(roleCandidate),
    statuses: RESCUE_REPORT_STATUS_VALUES,
    urgencies: RESCUE_REPORT_URGENCY_VALUES,
    species: RESCUE_REPORT_SPECIES_VALUES,
  };
}

export async function createRescueReport(payload) {
  const normalizedPayload = normalizeCreatePayload(payload);

  if (isDatabaseConnected()) {
    const createdReport = await RescueReport.create({
      ...normalizedPayload,
      status: 'pending',
      notes: '',
    });

    return serializeRescueReport(createdReport.toObject());
  }

  const reports = await readMockRescueReports();
  const now = new Date().toISOString();
  const reportRecord = {
    id: crypto.randomUUID(),
    ...normalizedPayload,
    status: 'pending',
    notes: '',
    createdAt: now,
    updatedAt: now,
  };

  reports.push(reportRecord);
  await writeMockRescueReports(reports);

  return serializeRescueReport(reportRecord);
}

export async function getRescueReportCollection(currentUser, filters = {}) {
  assertStaffPermission(currentUser, 'view-all');

  if (isDatabaseConnected()) {
    const reports = await RescueReport.find(buildRescueReportQuery(filters))
      .sort({ createdAt: -1 })
      .lean();

    return reports.map(serializeRescueReport);
  }

  const reports = await readMockRescueReports();
  return sortReportsByNewest(applyRescueReportFilters(reports, filters)).map(serializeRescueReport);
}

export async function getRescueReportById(reportId, currentUser) {
  assertStaffPermission(currentUser, 'detail');
  const report = await findRescueReportRecordById(reportId);

  if (!report) {
    throw createHttpError(404, 'Сигналът не беше намерен.');
  }

  return serializeRescueReport(report);
}

export async function updateRescueReportStatus(reportId, payload, currentUser) {
  assertStaffPermission(currentUser, 'update-status');
  const normalizedId = assertValidRescueReportId(reportId);
  const normalizedPayload = normalizeStatusUpdatePayload(payload);

  if (isDatabaseConnected()) {
    const updatedReport = await RescueReport.findByIdAndUpdate(
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

    if (!updatedReport) {
      throw createHttpError(404, 'Сигналът не беше намерен.');
    }

    return serializeRescueReport(updatedReport);
  }

  const reports = await readMockRescueReports();
  const reportIndex = reports.findIndex((entry) => entry.id === normalizedId);

  if (reportIndex === -1) {
    throw createHttpError(404, 'Сигналът не беше намерен.');
  }

  const updatedReport = {
    ...reports[reportIndex],
    status: normalizedPayload.status,
    notes: normalizedPayload.notes,
    updatedAt: new Date().toISOString(),
  };

  reports[reportIndex] = updatedReport;
  await writeMockRescueReports(reports);

  return serializeRescueReport(updatedReport);
}
