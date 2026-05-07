import crypto from 'node:crypto';

import mongoose from 'mongoose';

import { isDatabaseConnected } from '../../config/db.js';
import User from '../../models/User.js';
import { createHttpError } from '../../utils/httpError.js';
import { loadJsonFile } from '../../utils/loadJsonFile.js';
import { saveJsonFile } from '../../utils/saveJsonFile.js';

const USERS_DATA_PATH = 'data/users.json';

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

function parsePositiveInteger(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw createHttpError(400, `Параметърът "${fieldName}" трябва да бъде положително цяло число.`);
  }

  return numericValue;
}

function normalizePaginationOptions(filters = {}) {
  const page = parsePositiveInteger(filters.page, 'page', 1);
  const limit = parsePositiveInteger(filters.limit, 'limit', 10);

  return {
    page,
    limit,
  };
}

function buildPagination(total, options) {
  const effectiveLimit = options.limit || 1;
  const totalPages = total === 0 ? 0 : Math.ceil(total / effectiveLimit);
  const safePage = totalPages === 0 ? 1 : Math.min(options.page, totalPages);

  return {
    page: safePage,
    limit: effectiveLimit,
    total,
    totalPages,
    hasNextPage: totalPages > 0 && safePage < totalPages,
    hasPreviousPage: totalPages > 0 && safePage > 1,
  };
}

function buildPaginatedResult(items, total, paginationOptions) {
  const pagination = buildPagination(total, paginationOptions);

  return {
    items,
    total,
    pagination,
  };
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

async function readMockUsers() {
  return loadJsonFile(USERS_DATA_PATH);
}

async function writeMockUsers(users) {
  return saveJsonFile(USERS_DATA_PATH, users);
}

export async function findUserById(userId) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId) {
    return null;
  }

  if (isDatabaseConnected()) {
    if (!mongoose.isValidObjectId(normalizedUserId)) {
      return null;
    }

    return User.findById(normalizedUserId).lean();
  }

  const users = await readMockUsers();
  return users.find((entry) => entry.id === normalizedUserId) ?? null;
}

export async function findUserByUsername(username) {
  const normalizedUsername = normalizeLookupValue(username);

  if (!normalizedUsername) {
    return null;
  }

  if (isDatabaseConnected()) {
    return User.findOne({ username: normalizedUsername }).lean();
  }

  const users = await readMockUsers();
  return users.find((entry) => normalizeLookupValue(entry.username) === normalizedUsername) ?? null;
}

export async function findUserByEmail(email) {
  const normalizedEmail = normalizeLookupValue(email);

  if (!normalizedEmail) {
    return null;
  }

  if (isDatabaseConnected()) {
    return User.findOne({ email: normalizedEmail }).lean();
  }

  const users = await readMockUsers();
  return users.find((entry) => normalizeLookupValue(entry.email) === normalizedEmail) ?? null;
}

export async function findUserByIdentifier(identifier) {
  const normalizedIdentifier = normalizeLookupValue(identifier);

  if (!normalizedIdentifier) {
    return null;
  }

  if (isDatabaseConnected()) {
    return User.findOne({
      $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }],
    }).lean();
  }

  const users = await readMockUsers();
  return (
    users.find((entry) => {
      const username = normalizeLookupValue(entry.username);
      const email = normalizeLookupValue(entry.email);
      return username === normalizedIdentifier || email === normalizedIdentifier;
    }) ?? null
  );
}

export async function createUser(userPayload) {
  const normalizedPayload = {
    ...userPayload,
    username: normalizeLookupValue(userPayload.username),
    email: normalizeLookupValue(userPayload.email),
  };

  if (isDatabaseConnected()) {
    const createdUser = await User.create(normalizedPayload);
    return createdUser.toObject();
  }

  const users = await readMockUsers();
  const now = new Date().toISOString();
  const userRecord = {
    id: crypto.randomUUID(),
    firstName: normalizedPayload.firstName,
    lastName: normalizedPayload.lastName,
    username: normalizedPayload.username,
    email: normalizedPayload.email,
    passwordHash: normalizedPayload.passwordHash,
    role: normalizedPayload.role,
    isActive: normalizedPayload.isActive ?? true,
    lastLoginAt: normalizedPayload.lastLoginAt ?? null,
    createdAt: now,
    updatedAt: now,
  };

  users.push(userRecord);
  await writeMockUsers(users);

  return userRecord;
}

export async function updateUserById(userId, changes) {
  const normalizedUserId = normalizeText(userId);

  if (!normalizedUserId) {
    return null;
  }

  if (isDatabaseConnected()) {
    if (!mongoose.isValidObjectId(normalizedUserId)) {
      return null;
    }

    return User.findByIdAndUpdate(normalizedUserId, changes, {
      new: true,
      runValidators: true,
    }).lean();
  }

  const users = await readMockUsers();
  const userIndex = users.findIndex((entry) => entry.id === normalizedUserId);

  if (userIndex === -1) {
    return null;
  }

  const updatedUser = {
    ...users[userIndex],
    ...changes,
    updatedAt: new Date().toISOString(),
  };

  users[userIndex] = updatedUser;
  await writeMockUsers(users);

  return updatedUser;
}

function applyUserFilters(users, filters = {}) {
  const requestedRole = normalizeLookupValue(filters.role);
  const requestedStatus = normalizeLookupValue(filters.status);
  const searchTerm = normalizeLookupValue(filters.search);

  return users.filter((user) => {
    const matchesRole = !requestedRole || user.role === requestedRole;
    const matchesStatus =
      !requestedStatus ||
      (requestedStatus === 'active' && user.isActive) ||
      (requestedStatus === 'inactive' && !user.isActive);
    const matchesSearch =
      !searchTerm ||
      [user.firstName, user.lastName, user.username, user.email]
        .map((value) => normalizeLookupValue(value))
        .some((value) => value.includes(searchTerm));

    return matchesRole && matchesStatus && matchesSearch;
  });
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

function sortUsers(users) {
  return [...users].sort((leftUser, rightUser) => {
    const lastNameComparison = leftUser.lastName.localeCompare(rightUser.lastName, 'bg');

    if (lastNameComparison !== 0) {
      return lastNameComparison;
    }

    return leftUser.firstName.localeCompare(rightUser.firstName, 'bg');
  });
}

export async function listUsers(filters = {}) {
  const paginationOptions = normalizePaginationOptions(filters);

  if (isDatabaseConnected()) {
    const query = buildMongoUserQuery(filters);
    const total = await User.countDocuments(query);
    const pagination = buildPagination(total, paginationOptions);
    const users = await User.find(query)
      .sort({ lastName: 1, firstName: 1 })
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .lean();

    return {
      items: users,
      total,
      pagination,
    };
  }

  const users = await readMockUsers();
  const filteredUsers = sortUsers(applyUserFilters(users, filters));
  const total = filteredUsers.length;
  const pagination = buildPagination(total, paginationOptions);
  const startIndex = (pagination.page - 1) * pagination.limit;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pagination.limit);

  return buildPaginatedResult(paginatedUsers, total, paginationOptions);
}
