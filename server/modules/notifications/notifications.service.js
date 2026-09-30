import mongoose from 'mongoose';

import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  applyPagination,
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import { normalizeDateOutput, serializeId } from '../../utils/serialization.js';
import { hasPermission, normalizeRole } from '../shared/rolePolicies.js';
import {
  NOTIFICATION_DEFINITIONS,
  NOTIFICATION_TEXT_LIMITS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_VALUES,
} from '../../../shared/domain/notificationConstants.js';

const NOTIFICATION_ID_PATTERN = /^[0-9a-f]{24}$/i;
const DEFAULT_NOTIFICATION_LIMIT = 20;
const MAX_NOTIFICATION_LIMIT = 50;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLimitedText(value, fieldName, maxLength) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.length > maxLength) {
    throw createHttpError(
      400,
      `Полето "${fieldName}" не може да бъде по-дълго от ${maxLength} символа.`
    );
  }

  return normalizedValue;
}

function normalizeNotificationType(value) {
  const normalizedType = normalizeText(value);

  if (!NOTIFICATION_TYPE_VALUES.includes(normalizedType)) {
    throw createHttpError(400, 'Типът на известието е невалиден.', {
      allowedTypes: NOTIFICATION_TYPE_VALUES,
    });
  }

  return normalizedType;
}

function getNotificationDefinition(type) {
  const definition = NOTIFICATION_DEFINITIONS[type];

  if (!definition) {
    throw createHttpError(400, 'Типът на известието е невалиден.', {
      allowedTypes: NOTIFICATION_TYPE_VALUES,
    });
  }

  return definition;
}

function assertResourceTypeMatchesDefinition(payloadResourceType, definition) {
  if (payloadResourceType === undefined) {
    return;
  }

  const normalizedResourceType = normalizeText(payloadResourceType);

  if (!normalizedResourceType || normalizedResourceType === definition.resourceType) {
    return;
  }

  throw createHttpError(
    400,
    'Типът на ресурса не съответства на типа на известието.',
    {
      expectedResourceType: definition.resourceType,
      receivedResourceType: normalizedResourceType,
    }
  );
}

function assertNotificationPermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
  }

  if (!hasPermission(currentUser.role, 'notifications', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function assertValidNotificationId(notificationId) {
  const normalizedId = normalizeText(notificationId);

  if (!normalizedId) {
    throw createHttpError(400, 'Липсва идентификатор на известието.');
  }

  if (!NOTIFICATION_ID_PATTERN.test(normalizedId) || !mongoose.isValidObjectId(normalizedId)) {
    throw createHttpError(400, 'Идентификаторът на известието е в невалиден формат.');
  }

  return normalizedId;
}

function normalizeNotificationPayload(payload = {}) {
  const type = normalizeNotificationType(payload.type);
  const definition = getNotificationDefinition(type);
  const title = normalizeLimitedText(
    payload.title || definition.label || NOTIFICATION_TYPE_LABELS[type],
    'title',
    NOTIFICATION_TEXT_LIMITS.title
  );
  const message = normalizeLimitedText(payload.message, 'message', NOTIFICATION_TEXT_LIMITS.message);
  const resourceId = normalizeLimitedText(payload.resourceId, 'resourceId', NOTIFICATION_TEXT_LIMITS.resourceId);
  const dedupeKey = normalizeLimitedText(payload.dedupeKey, 'dedupeKey', NOTIFICATION_TEXT_LIMITS.dedupeKey);

  assertResourceTypeMatchesDefinition(payload.resourceType, definition);

  if (!title || !message || !resourceId) {
    throw createHttpError(400, 'Известието трябва да има заглавие, съобщение и ресурс.');
  }

  return {
    type,
    title,
    message,
    resourceType: definition.resourceType,
    resourceId,
    ...(dedupeKey ? { dedupeKey } : {}),
    isRead: false,
    lastTriggeredAt: new Date(),
  };
}

function safeNormalizeNotificationPayload(payload) {
  try {
    return normalizeNotificationPayload(payload);
  } catch (error) {
    console.error('Notification payload is invalid.', error);
    return null;
  }
}

function normalizeRecipientId(recipientId) {
  const normalizedRecipientId = serializeId(recipientId);

  if (!normalizedRecipientId || !mongoose.isValidObjectId(normalizedRecipientId)) {
    return '';
  }

  return normalizedRecipientId;
}

function serializeNotification(notification) {
  return {
    id: serializeId(notification),
    type: notification.type ?? '',
    title: notification.title ?? '',
    message: notification.message ?? '',
    resourceType: notification.resourceType ?? '',
    resourceId: notification.resourceId ?? '',
    isRead: Boolean(notification.isRead),
    lastTriggeredAt: normalizeDateOutput(notification.lastTriggeredAt ?? notification.createdAt),
    createdAt: normalizeDateOutput(notification.createdAt),
    updatedAt: normalizeDateOutput(notification.updatedAt),
  };
}

async function createNotificationDocuments(documents) {
  const validDocuments = documents.filter((document) => normalizeRecipientId(document.recipient));

  if (validDocuments.length === 0) {
    return [];
  }

  try {
    const createdNotifications = await Notification.insertMany(validDocuments, {
      ordered: false,
    });

    return createdNotifications.map((notification) => notification.toObject());
  } catch (error) {
    console.error('Notification creation failed.', error);
    return [];
  }
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function buildDefaultDedupeKey(document) {
  return `${document.type}:${document.resourceId}`;
}

async function upsertUnreadNotificationDocument(document) {
  const dedupeKey = document.dedupeKey || buildDefaultDedupeKey(document);
  const filter = {
    recipient: document.recipient,
    isRead: false,
    $or: [
      {
        dedupeKey,
      },
      {
        type: document.type,
        resourceType: document.resourceType,
        resourceId: document.resourceId,
        dedupeKey: { $exists: false },
      },
    ],
  };
  const update = {
    $set: {
      type: document.type,
      title: document.title,
      message: document.message,
      resourceType: document.resourceType,
      resourceId: document.resourceId,
      dedupeKey,
      lastTriggeredAt: new Date(),
    },
    $setOnInsert: {
      recipient: document.recipient,
      isRead: false,
    },
  };
  const updateOptions = {
    returnDocument: 'after',
    runValidators: true,
    setDefaultsOnInsert: true,
    upsert: true,
  };

  // The partial unique index keeps one unread row per key; concurrent duplicate upserts retry without insertion.
  try {
    return await Notification.findOneAndUpdate(filter, update, updateOptions).lean();
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    return Notification.findOneAndUpdate(
      filter,
      update,
      {
        ...updateOptions,
        upsert: false,
      }
    ).lean();
  }
}

async function upsertUnreadNotificationDocuments(documents) {
  const validDocuments = documents.filter((document) => normalizeRecipientId(document.recipient));

  if (validDocuments.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    validDocuments.map((document) => upsertUnreadNotificationDocument(document))
  );

  return results
    .map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      console.error('Notification upsert failed.', result.reason);
      return null;
    })
    .filter(Boolean);
}

async function findActiveRoleRecipients(roles) {
  try {
    return await User.find({
      role: { $in: roles },
      isActive: true,
    })
      .select('_id')
      .lean();
  } catch (error) {
    console.error('Notification recipient lookup failed.', error);
    return [];
  }
}

export async function notifyUser(recipientId, payload) {
  const normalizedRecipientId = normalizeRecipientId(recipientId);

  if (!normalizedRecipientId) {
    return null;
  }

  const normalizedPayload = safeNormalizeNotificationPayload(payload);

  if (!normalizedPayload) {
    return null;
  }

  const [notification] = await createNotificationDocuments([
    {
      recipient: normalizedRecipientId,
      ...normalizedPayload,
    },
  ]);

  return notification ? serializeNotification(notification) : null;
}

export async function notifyUsersByRole(roleValues, payload, options = {}) {
  const roles = [...new Set((Array.isArray(roleValues) ? roleValues : [roleValues]).map(normalizeRole))]
    .filter((role) => role !== 'guest');
  const excludedUserIds = new Set((options.excludeUserIds ?? []).map(serializeId).filter(Boolean));

  if (roles.length === 0) {
    return [];
  }

  const recipients = await findActiveRoleRecipients(roles);
  const normalizedPayload = safeNormalizeNotificationPayload(payload);

  if (!normalizedPayload) {
    return [];
  }

  const documents = recipients
    .filter((recipient) => !excludedUserIds.has(serializeId(recipient)))
    .map((recipient) => ({
      recipient: recipient._id,
      ...normalizedPayload,
    }));
  const createdNotifications = await createNotificationDocuments(documents);

  return createdNotifications.map(serializeNotification);
}

export async function notifyUnreadUsersByRole(roleValues, payload, options = {}) {
  const roles = [...new Set((Array.isArray(roleValues) ? roleValues : [roleValues]).map(normalizeRole))]
    .filter((role) => role !== 'guest');
  const excludedUserIds = new Set((options.excludeUserIds ?? []).map(serializeId).filter(Boolean));

  if (roles.length === 0) {
    return [];
  }

  const recipients = await findActiveRoleRecipients(roles);
  const normalizedPayload = safeNormalizeNotificationPayload(payload);

  if (!normalizedPayload) {
    return [];
  }

  const documents = recipients
    .filter((recipient) => !excludedUserIds.has(serializeId(recipient)))
    .map((recipient) => ({
      recipient: recipient._id,
      ...normalizedPayload,
    }));
  const notifications = await upsertUnreadNotificationDocuments(documents);

  return notifications.map(serializeNotification);
}

export async function notifyOperationalStaff(payload, options = {}) {
  return notifyUsersByRole(['employee', 'admin'], payload, options);
}

export async function getNotificationCollection(currentUser, filters = {}) {
  assertNotificationPermission(currentUser, 'list-own');
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: DEFAULT_NOTIFICATION_LIMIT,
    maxLimit: MAX_NOTIFICATION_LIMIT,
  });
  const query = {
    recipient: currentUser.id,
  };
  const total = await Notification.countDocuments(query);
  const pagination = buildPagination(total, paginationOptions);
  const notifications = await applyPagination(
    Notification.find(query).sort({ lastTriggeredAt: -1, _id: -1 }),
    pagination
  ).lean();

  return {
    items: notifications.map(serializeNotification),
    total,
    pagination,
  };
}

export async function getUnreadNotificationCount(currentUser) {
  assertNotificationPermission(currentUser, 'list-own');
  const unreadCount = await Notification.countDocuments({
    recipient: currentUser.id,
    isRead: false,
  });

  return {
    unreadCount,
  };
}

export async function markNotificationAsRead(notificationId, payload, currentUser) {
  assertNotificationPermission(currentUser, 'mark-own-read');
  assertBodyObject(payload ?? {}, { allowEmpty: true });
  assertAllowedFields(payload ?? {}, []);
  const normalizedId = assertValidNotificationId(notificationId);
  const notification = await Notification.findOneAndUpdate(
    {
      _id: normalizedId,
      recipient: currentUser.id,
    },
    {
      $set: {
        isRead: true,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  ).lean();

  if (!notification) {
    throw createHttpError(404, 'Известието не беше намерено.');
  }

  return serializeNotification(notification);
}

export async function markAllNotificationsAsRead(payload, currentUser) {
  assertNotificationPermission(currentUser, 'mark-own-read');
  assertBodyObject(payload ?? {}, { allowEmpty: true });
  assertAllowedFields(payload ?? {}, []);
  const updateResult = await Notification.updateMany(
    {
      recipient: currentUser.id,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
      },
    }
  );

  return {
    updatedCount: updateResult.modifiedCount ?? 0,
  };
}
