import mongoose from 'mongoose';

import User from '../../models/User.js';
import {
  applyPagination,
  buildPagination,
  normalizePaginationOptions,
} from '../../utils/pagination.js';
import {
  normalizeDateOutput,
  serializeId,
} from '../../utils/serialization.js';

const USER_PUBLIC_PROJECTION =
  'firstName lastName username email role isActive lastLoginAt createdAt updatedAt';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLookupValue(value) {
  return normalizeText(value).toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function serializeUserView(user) {
  return {
    id: serializeId(user),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.isActive),
    lastLoginAt: normalizeDateOutput(user.lastLoginAt),
    createdAt: normalizeDateOutput(user.createdAt),
    updatedAt: normalizeDateOutput(user.updatedAt),
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

export async function updateUserById(
  userId,
  changes,
  { incrementAuthVersion = false, timestamps = true } = {}
) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId || !mongoose.isValidObjectId(normalizedUserId)) {
    return null;
  }

  const updatePayload = incrementAuthVersion
    ? {
        $set: changes,
        $inc: {
          authVersion: 1,
        },
      }
    : changes;

  return User.findByIdAndUpdate(normalizedUserId, updatePayload, {
    returnDocument: 'after',
    runValidators: true,
    timestamps,
  }).lean();
}

export async function getUserSummary() {
  const [total, active, inactive, clients, employees, admins] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ role: 'client' }),
    User.countDocuments({ role: 'employee' }),
    User.countDocuments({ role: 'admin' }),
  ]);

  return {
    total,
    active,
    inactive,
    clients,
    employees,
    admins,
  };
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
  const [total, summary] = await Promise.all([
    User.countDocuments(query),
    getUserSummary(),
  ]);
  const pagination = buildPagination(total, paginationOptions);
  const users = await applyPagination(
    User.find(query)
      .select(USER_PUBLIC_PROJECTION)
      .sort({ lastName: 1, firstName: 1, _id: 1 }),
    pagination
  ).lean();

  return {
    items: users,
    total,
    pagination,
    summary,
  };
}
