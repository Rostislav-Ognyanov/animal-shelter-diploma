import mongoose from 'mongoose';

import User from '../../models/User.js';
import {
  applyPagination,
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLookupValue(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function serializeId(user) {
  if (user.id) {
    return String(user.id);
  }

  if (user._id) {
    return String(user._id);
  }

  return '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function serializePublicUser(user) {
  return {
    id: serializeId(user),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.isActive),
    lastLoginAt: normalizeDateValue(user.lastLoginAt),
    createdAt: normalizeDateValue(user.createdAt),
    updatedAt: normalizeDateValue(user.updatedAt),
  };
}

export async function findUserById(userId) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId || !mongoose.isValidObjectId(normalizedUserId)) {
    return null;
  }

  return User.findById(normalizedUserId).lean();
}

export async function findUserByUsername(username) {
  const normalizedUsername = normalizeLookupValue(username);

  if (!normalizedUsername) {
    return null;
  }

  return User.findOne({ username: normalizedUsername }).lean();
}

export async function findUserByEmail(email) {
  const normalizedEmail = normalizeLookupValue(email);

  if (!normalizedEmail) {
    return null;
  }

  return User.findOne({ email: normalizedEmail }).lean();
}

export async function findUserByIdentifier(identifier) {
  const normalizedIdentifier = normalizeLookupValue(identifier);

  if (!normalizedIdentifier) {
    return null;
  }

  return User.findOne({
    $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }],
  }).lean();
}

export async function createUser(userPayload) {
  const normalizedPayload = {
    ...userPayload,
    username: normalizeLookupValue(userPayload.username),
    email: normalizeLookupValue(userPayload.email),
  };
  const createdUser = await User.create(normalizedPayload);

  return createdUser.toObject();
}

export async function updateUserById(userId, changes) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId || !mongoose.isValidObjectId(normalizedUserId)) {
    return null;
  }

  return User.findByIdAndUpdate(normalizedUserId, changes, {
    new: true,
    runValidators: true,
  }).lean();
}

function buildMongoUserQuery(filters = {}) {
  const query = {};
  const searchTerm = normalizeLookupValue(filters.search);

  if (filters.role) {
    query.role = filters.role;
  }

  if (filters.status === 'active') {
    query.isActive = true;
  }

  if (filters.status === 'inactive') {
    query.isActive = false;
  }

  if (searchTerm) {
    const regex = new RegExp(escapeRegex(searchTerm), 'i');
    query.$or = [
      { firstName: regex },
      { lastName: regex },
      { username: regex },
      { email: regex },
    ];
  }

  return query;
}

export async function listUsers(filters = {}) {
  const paginationOptions = normalizePaginationOptions(filters, {
    defaultLimit: 10,
    maxLimit: 50,
  });
  const query = buildMongoUserQuery(filters);
  const total = await User.countDocuments(query);
  const pagination = buildPagination(total, paginationOptions);
  const users = await applyPagination(
    User.find(query).sort({ lastName: 1, firstName: 1, _id: 1 }),
    pagination
  ).lean();

  return {
    items: users,
    total,
    pagination,
  };
}
