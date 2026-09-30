import mongoose from 'mongoose';

import Donation from '../../models/Donation.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { readWorkflowCollectionPage } from '../../utils/workflowList.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { normalizeDateOutput, serializeId } from '../../utils/serialization.js';
import { notifyOperationalStaff } from '../notifications/notifications.service.js';
import { hasPermission } from '../shared/rolePolicies.js';
import { isValidPhone } from '../../../shared/domain/contactValidation.js';
import {
  DONATION_AMOUNT_LIMITS,
  DONATION_CURRENCY,
  DONATION_STATUS_TRANSITIONS,
  DONATION_STATUS_VALUES,
  DONATION_TEXT_LIMITS,
} from '../../../shared/domain/donationConstants.js';

const DONATION_ID_PATTERN = /^[0-9a-f]{24}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_DONATION_STATUS = 'pledged';
const DONATION_FIELD_LABELS = Object.freeze({
  name: 'Име',
  email: 'Имейл',
  phone: 'Телефон',
  message: 'Съобщение',
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

function normalizeLimitedText(value, fieldName, maxLength) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.length > maxLength) {
    const fieldLabel = DONATION_FIELD_LABELS[fieldName] ?? fieldName;

    throw createHttpError(
      400,
      `Полето "${fieldLabel}" не може да бъде по-дълго от ${maxLength} символа.`
    );
  }

  return normalizedValue;
}

function getUserDisplayName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || '';
}

function assertStaffPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'donations', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function normalizeDonationAmountCents(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < DONATION_AMOUNT_LIMITS.min) {
    throw createHttpError(400, 'Сумата на заявката за дарение трябва да бъде поне 1 евро.');
  }

  if (numericValue > DONATION_AMOUNT_LIMITS.max) {
    throw createHttpError(
      400,
      `Сумата на заявката за дарение не може да надвишава ${DONATION_AMOUNT_LIMITS.max} евро.`
    );
  }

  const cents = Math.round(numericValue * 100);
  const roundedAmount = cents / 100;

  if (Math.abs(numericValue - roundedAmount) > 0.0000001) {
    throw createHttpError(400, 'Сумата на заявката за дарение може да има най-много два знака след десетичната запетая.');
  }

  return cents;
}

function normalizeDonationStatus(value) {
  const status = normalizeLookupText(value || DEFAULT_DONATION_STATUS);

  if (!DONATION_STATUS_VALUES.includes(status)) {
    throw createHttpError(400, 'Статусът на заявката за дарение е невалиден.', {
      allowedStatuses: DONATION_STATUS_VALUES,
    });
  }

  return status;
}

function assertAllowedDonationStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    throw createHttpError(409, 'Заявката за дарение вече е с този статус.');
  }

  const allowedTransitions = DONATION_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (!allowedTransitions.includes(nextStatus)) {
    throw createHttpError(
      409,
      `Преходът от "${currentStatus}" към "${nextStatus}" не е разрешен.`
    );
  }
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

function buildStatusHistoryEntry(fromStatus, toStatus, currentUser = null) {
  return {
    fromStatus: fromStatus ?? '',
    toStatus,
    changedBy: currentUser?.id ?? null,
    changedByName: getUserDisplayName(currentUser),
    changedAt: new Date(),
  };
}

function serializeStatusHistoryEntry(entry) {
  return {
    fromStatus: entry?.fromStatus ?? '',
    toStatus: entry?.toStatus ?? '',
    changedBy: serializeId(entry?.changedBy) || null,
    changedByName: entry?.changedByName ?? '',
    changedAt: normalizeDateOutput(entry?.changedAt),
  };
}

function normalizeCreatePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['name', 'email', 'phone', 'amount', 'message']);

  const name = normalizeLimitedText(payload.name, 'name', DONATION_TEXT_LIMITS.name);
  const email = normalizeLimitedText(payload.email, 'email', DONATION_TEXT_LIMITS.email).toLowerCase();
  const phone = normalizeLimitedText(payload.phone, 'phone', DONATION_TEXT_LIMITS.phone);
  const amountCents = normalizeDonationAmountCents(payload.amount);
  const message = normalizeLimitedText(payload.message, 'message', DONATION_TEXT_LIMITS.message);

  if (!name || !email) {
    throw createHttpError(400, 'Попълни името, имейла и сумата на заявката за дарение.');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (phone && !isValidPhone(phone)) {
    throw createHttpError(400, 'Въведи валиден телефонен номер.');
  }

  return {
    name,
    email,
    phone,
    amountCents,
    message,
    status: DEFAULT_DONATION_STATUS,
    receivedAt: null,
    statusHistory: [buildStatusHistoryEntry('', DEFAULT_DONATION_STATUS)],
  };
}

function normalizeStatusUpdatePayload(payload = {}, currentDonation) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['status']);

  const nextStatus = normalizeDonationStatus(payload.status);
  const currentStatus = normalizeDonationStatus(currentDonation?.status);

  assertAllowedDonationStatusTransition(currentStatus, nextStatus);

  return {
    status: nextStatus,
  };
}

function buildDonationStatusMatchFilter(donation, currentStatus) {
  if (normalizeLookupText(donation?.status)) {
    return {
      status: currentStatus,
    };
  }

  return {
    $or: [
      { status: currentStatus },
      { status: { $exists: false } },
      { status: '' },
      { status: null },
    ],
  };
}

function getDonationAmountCents(donation) {
  if (Number.isInteger(donation?.amountCents)) {
    return donation.amountCents;
  }

  return 0;
}

function serializeDonation(donation) {
  const status = normalizeDonationStatus(donation.status);
  const amountCents = getDonationAmountCents(donation);

  return {
    id: serializeId(donation),
    name: donation.name ?? '',
    email: donation.email ?? '',
    phone: donation.phone ?? '',
    amount: amountCents / 100,
    amountCents,
    currency: DONATION_CURRENCY,
    message: donation.message ?? '',
    status,
    allowedStatusTransitions: DONATION_STATUS_TRANSITIONS[status] ?? [],
    statusHistory: (donation.statusHistory ?? []).map(serializeStatusHistoryEntry),
    receivedAt: normalizeDateOutput(donation.receivedAt),
    createdAt: normalizeDateOutput(donation.createdAt),
    updatedAt: normalizeDateOutput(donation.updatedAt),
  };
}

function buildDonationQuery(filters = {}) {
  const search = normalizeLookupText(filters.search);
  const status = normalizeLookupText(filters.status);
  const query = {};

  if (status) {
    query.status = normalizeDonationStatus(status);
  }

  if (!search) {
    return query;
  }

  const regex = new RegExp(escapeRegex(search), 'i');
  query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { message: regex }];

  return query;
}

async function findDonationRecordById(donationId) {
  const normalizedId = assertValidDonationId(donationId);

  if (!mongoose.isValidObjectId(normalizedId)) {
    return null;
  }

  return Donation.findById(normalizedId).lean();
}

async function notifyDonationCreated(serializedDonation) {
  try {
    await notifyOperationalStaff({
      type: 'donation-created',
      title: 'Нова заявка за дарение',
      message: `Получена е нова заявка за дарение от ${serializedDonation.name}.`,
      resourceId: serializedDonation.id,
    });
  } catch (error) {
    console.error('[donations] donation-created notification failed', error);
  }
}

export function canUpdateDonationStatus(roleCandidate) {
  return hasPermission(roleCandidate, 'donations', 'update-status');
}

export async function createDonation(payload) {
  const createdDonation = await Donation.create(normalizeCreatePayload(payload));
  const serializedDonation = serializeDonation(createdDonation.toObject());

  await notifyDonationCreated(serializedDonation);

  return serializedDonation;
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
  const donations = await readWorkflowCollectionPage({
    model: Donation,
    query,
    pagination,
    statusTransitions: DONATION_STATUS_TRANSITIONS,
  });

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

export async function updateDonationStatus(donationId, payload, currentUser) {
  assertStaffPermission(currentUser, 'update-status');
  const normalizedId = assertValidDonationId(donationId);
  const donation = await Donation.findById(normalizedId).lean();

  if (!donation) {
    throw createHttpError(404, 'Дарението не беше намерено.');
  }

  const normalizedPayload = normalizeStatusUpdatePayload(payload, donation);
  const currentStatus = normalizeDonationStatus(donation.status);

  const statusHistoryEntry = buildStatusHistoryEntry(
    currentStatus,
    normalizedPayload.status,
    currentUser
  );
  const updateOperation = {
    $set: {
      status: normalizedPayload.status,
      ...(normalizedPayload.status === 'received' ? { receivedAt: statusHistoryEntry.changedAt } : {}),
    },
    $push: {
      statusHistory: statusHistoryEntry,
    },
  };

  const updatedDonation = await Donation.findOneAndUpdate(
    {
      _id: normalizedId,
      ...buildDonationStatusMatchFilter(donation, currentStatus),
    },
    updateOperation,
    {
      returnDocument: 'after',
      runValidators: true,
    }
  ).lean();

  if (!updatedDonation) {
    throw createHttpError(409, 'Статусът на заявката за дарение е променен преди обновяването да бъде записано.');
  }

  return serializeDonation(updatedDonation);
}
