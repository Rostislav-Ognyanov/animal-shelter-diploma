import crypto from 'node:crypto';

import mongoose from 'mongoose';

import { isDatabaseConnected } from '../../config/db.js';
import Donation from '../../models/Donation.js';
import { createHttpError } from '../../utils/httpError.js';
import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { saveJsonFile } from '../../utils/saveJsonFile.js';
import { getAllowedDonationActions, hasPermission } from '../shared/rolePolicies.js';

const DONATIONS_DATA_PATH = 'data/donations.json';
const DONATION_ID_PATTERN =
  /^[0-9a-f]{24}$|^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\s().-]{6,32}$/;
const MAX_DONATION_AMOUNT = 100000;

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

  if (!hasPermission(currentUser.role, 'donations', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function normalizeDonationAmount(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    throw createHttpError(400, 'Сумата на дарението трябва да бъде поне 1 евро.');
  }

  if (numericValue > MAX_DONATION_AMOUNT) {
    throw createHttpError(400, `Сумата на дарението не може да надвишава ${MAX_DONATION_AMOUNT} евро.`);
  }

  return Number(numericValue.toFixed(2));
}

function assertValidDonationId(donationId) {
  const normalizedId = normalizeText(donationId);

  if (!normalizedId) {
    throw createHttpError(400, 'Липсва идентификатор на дарението.');
  }

  if (!DONATION_ID_PATTERN.test(normalizedId)) {
    throw createHttpError(400, 'Идентификаторът на дарението е в невалиден формат.');
  }

  return normalizedId;
}

function normalizeCreatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['name', 'email', 'phone', 'amount', 'message']);

  const name = normalizeText(payload.name);
  const email = normalizeLookupText(payload.email);
  const phone = normalizeText(payload.phone);
  const amount = normalizeDonationAmount(payload.amount);
  const message = normalizeText(payload.message);

  if (!name || !email) {
    throw createHttpError(400, 'Попълни името, имейла и сумата на дарението.');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    throw createHttpError(400, 'Въведи валиден телефонен номер.');
  }

  return {
    name,
    email,
    phone,
    amount,
    message,
  };
}

function serializeDonation(donation) {
  return {
    id: serializeId(donation),
    name: donation.name ?? '',
    email: donation.email ?? '',
    phone: donation.phone ?? '',
    amount: donation.amount ?? 0,
    currency: 'EUR',
    message: donation.message ?? '',
    createdAt: normalizeDateOutput(donation.createdAt),
    updatedAt: normalizeDateOutput(donation.updatedAt),
  };
}

async function readMockDonations() {
  return loadJsonFile(DONATIONS_DATA_PATH);
}

async function writeMockDonations(donations) {
  return saveJsonFile(DONATIONS_DATA_PATH, donations);
}

function buildDonationQuery(filters = {}) {
  const search = normalizeLookupText(filters.search);

  if (!search) {
    return {};
  }

  const regex = new RegExp(escapeRegex(search), 'i');
  return {
    $or: [{ name: regex }, { email: regex }, { phone: regex }, { message: regex }],
  };
}

function applyDonationFilters(donations, filters = {}) {
  const search = normalizeLookupText(filters.search);

  return donations.filter((donation) => {
    if (!search) {
      return true;
    }

    return [donation.name, donation.email, donation.phone, donation.message]
      .map((entry) => normalizeLookupText(entry))
      .some((entry) => entry.includes(search));
  });
}

function sortDonationsByNewest(donations) {
  return [...donations].sort((leftDonation, rightDonation) => {
    const leftCreatedAt = new Date(leftDonation.createdAt ?? 0).getTime();
    const rightCreatedAt = new Date(rightDonation.createdAt ?? 0).getTime();
    return rightCreatedAt - leftCreatedAt;
  });
}

async function findDonationRecordById(donationId) {
  const normalizedId = assertValidDonationId(donationId);

  if (isDatabaseConnected()) {
    if (!mongoose.isValidObjectId(normalizedId)) {
      return null;
    }

    return Donation.findById(normalizedId).lean();
  }

  const donations = await readMockDonations();
  return donations.find((entry) => entry.id === normalizedId) ?? null;
}

export function getDonationModulePolicy(roleCandidate) {
  return {
    resource: 'donations',
    allowedActions: getAllowedDonationActions(roleCandidate),
  };
}

export async function createDonation(payload) {
  const normalizedPayload = normalizeCreatePayload(payload);

  if (isDatabaseConnected()) {
    const createdDonation = await Donation.create(normalizedPayload);
    return serializeDonation(createdDonation.toObject());
  }

  const donations = await readMockDonations();
  const now = new Date().toISOString();
  const donationRecord = {
    id: crypto.randomUUID(),
    ...normalizedPayload,
    createdAt: now,
    updatedAt: now,
  };

  donations.push(donationRecord);
  await writeMockDonations(donations);

  return serializeDonation(donationRecord);
}

export async function getDonationCollection(currentUser, filters = {}) {
  assertStaffPermission(currentUser, 'view-all');

  if (isDatabaseConnected()) {
    const donations = await Donation.find(buildDonationQuery(filters)).sort({ createdAt: -1 }).lean();
    return donations.map(serializeDonation);
  }

  const donations = await readMockDonations();
  return sortDonationsByNewest(applyDonationFilters(donations, filters)).map(serializeDonation);
}

export async function getDonationById(donationId, currentUser) {
  assertStaffPermission(currentUser, 'detail');
  const donation = await findDonationRecordById(donationId);

  if (!donation) {
    throw createHttpError(404, 'Дарението не беше намерено.');
  }

  return serializeDonation(donation);
}
