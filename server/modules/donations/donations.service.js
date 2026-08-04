import mongoose from 'mongoose';

import Donation from '../../models/Donation.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  applyPagination,
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { getAllowedDonationActions, hasPermission } from '../shared/rolePolicies.js';

const DONATION_ID_PATTERN = /^[0-9a-f]{24}$/i;
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

async function findDonationRecordById(donationId) {
  const normalizedId = assertValidDonationId(donationId);

  if (!mongoose.isValidObjectId(normalizedId)) {
    return null;
  }

  return Donation.findById(normalizedId).lean();
}

export function getDonationModulePolicy(roleCandidate) {
  return {
    resource: 'donations',
    allowedActions: getAllowedDonationActions(roleCandidate),
  };
}

export async function createDonation(payload) {
  const createdDonation = await Donation.create(normalizeCreatePayload(payload));
  return serializeDonation(createdDonation.toObject());
}

export async function getDonationCollection(currentUser, filters = {}) {
  assertStaffPermission(currentUser, 'view-all');
  const query = buildDonationQuery(filters);
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: 20,
    maxLimit: 50,
  });
  const total = await Donation.countDocuments(query);
  const pagination = buildPagination(total, paginationOptions);
  const donations = await applyPagination(
    Donation.find(query).sort({ createdAt: -1, _id: -1 }),
    pagination
  ).lean();

  return {
    items: donations.map(serializeDonation),
    total,
    pagination,
  };
}

export async function getDonationById(donationId, currentUser) {
  assertStaffPermission(currentUser, 'detail');
  const donation = await findDonationRecordById(donationId);

  if (!donation) {
    throw createHttpError(404, 'Дарението не беше намерено.');
  }

  return serializeDonation(donation);
}
