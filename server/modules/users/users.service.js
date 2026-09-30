import { createHttpError } from '../../utils/httpError.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import {
  isPasswordWithinBcryptLimit,
  isStrongPassword,
} from '../../utils/userValidation.js';
import { MANAGED_USER_ROLE_VALUES } from '../../../shared/domain/roleConstants.js';
import {
  EMAIL_PATTERN,
  USER_EMAIL_MAX_LENGTH,
  USER_FIRST_NAME_MAX_LENGTH,
  USER_LAST_NAME_MAX_LENGTH,
  USER_PASSWORD_MAX_BYTES,
  USER_PASSWORD_MIN_LENGTH,
  USER_STATUS_VALUES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '../../../shared/domain/userConstants.js';
import { createAuthToken, hashPassword, verifyPassword } from '../auth/auth.security.js';
import { createDuplicateUserConflictError } from '../shared/userDuplicateErrors.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  listUsers,
  serializeUserView,
  updateUserById,
} from './users.repository.js';
import {
  USER_ADMIN_PROFILE_EDITABLE_FIELDS,
  USER_ADMIN_STATUS_EDITABLE_FIELDS,
  USER_EMPLOYEE_CREATE_FIELDS,
  USER_SELF_EDITABLE_FIELDS,
} from './user.constants.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizePassword(value) {
  return String(value ?? '');
}

function assertMaxLength(value, maxLength, message) {
  if (value.length > maxLength) {
    throw createHttpError(400, message);
  }
}

function normalizeLookupText(value) {
  return normalizeText(value).toLowerCase();
}

function assertNonEmptyPayload(payload, message = 'Не са подадени данни за обновяване.') {
  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, message);
  }
}

function normalizeRequiredName(value, fieldName) {
  const normalizedValue = normalizeText(value);
  const maxLength = fieldName === 'lastName'
    ? USER_LAST_NAME_MAX_LENGTH
    : USER_FIRST_NAME_MAX_LENGTH;
  const fieldLabel = fieldName === 'lastName' ? 'Фамилията' : 'Името';

  if (!normalizedValue) {
    throw createHttpError(400, `Полето "${fieldName}" е задължително.`);
  }

  assertMaxLength(
    normalizedValue,
    maxLength,
    `${fieldLabel} може да бъде най-много ${maxLength} символа.`
  );

  return normalizedValue;
}

function normalizeOptionalName(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = normalizeText(value);
  const maxLength = fieldName === 'lastName'
    ? USER_LAST_NAME_MAX_LENGTH
    : USER_FIRST_NAME_MAX_LENGTH;
  const fieldLabel = fieldName === 'lastName' ? 'Фамилията' : 'Името';

  if (!normalizedValue) {
    throw createHttpError(400, `Полето "${fieldName}" не може да бъде празно.`);
  }

  assertMaxLength(
    normalizedValue,
    maxLength,
    `${fieldLabel} може да бъде най-много ${maxLength} символа.`
  );

  return normalizedValue;
}

function normalizeRequiredEmail(value) {
  const normalizedValue = normalizeLookupText(value);

  if (!normalizedValue) {
    throw createHttpError(400, 'Полето "email" е задължително.');
  }

  assertMaxLength(
    normalizedValue,
    USER_EMAIL_MAX_LENGTH,
    `Имейл адресът може да бъде най-много ${USER_EMAIL_MAX_LENGTH} символа.`
  );

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  return normalizedValue;
}

function normalizeOptionalEmail(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = normalizeLookupText(value);

  if (!normalizedValue) {
    throw createHttpError(400, 'Полето "email" не може да бъде празно.');
  }

  assertMaxLength(
    normalizedValue,
    USER_EMAIL_MAX_LENGTH,
    `Имейл адресът може да бъде най-много ${USER_EMAIL_MAX_LENGTH} символа.`
  );

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  return normalizedValue;
}

function normalizeRequiredUsername(value) {
  const normalizedValue = normalizeLookupText(value);

  if (!normalizedValue) {
    throw createHttpError(400, 'Полето "username" е задължително.');
  }

  if (!USERNAME_PATTERN.test(normalizedValue)) {
    throw createHttpError(
      400,
      `Потребителското име трябва да е между ${USERNAME_MIN_LENGTH} и ${USERNAME_MAX_LENGTH} символа и може да съдържа букви, цифри, точка, тире и долна черта.`
    );
  }

  return normalizedValue;
}

function normalizeRequiredPassword(value, fieldName = 'password') {
  const normalizedValue = normalizePassword(value);

  if (!normalizedValue) {
    throw createHttpError(400, `Полето "${fieldName}" е задължително.`);
  }

  if (!isPasswordWithinBcryptLimit(normalizedValue)) {
    throw createHttpError(400, `Полето "${fieldName}" може да бъде най-много ${USER_PASSWORD_MAX_BYTES} UTF-8 байта.`);
  }

  return normalizedValue;
}

function assertStrongPassword(password) {
  if (!isStrongPassword(password)) {
    throw createHttpError(
      400,
      `Паролата трябва да е поне ${USER_PASSWORD_MIN_LENGTH} символа, да бъде до ${USER_PASSWORD_MAX_BYTES} UTF-8 байта и да съдържа поне една буква и една цифра.`
    );
  }
}

function normalizeManagedRole(value, fieldName = 'role') {
  const normalizedValue = normalizeLookupText(value);

  if (!MANAGED_USER_ROLE_VALUES.includes(normalizedValue)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалидна роля.`, {
      allowedRoles: MANAGED_USER_ROLE_VALUES,
    });
  }

  return normalizedValue;
}

function parseBooleanField(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  throw createHttpError(400, `Полето "${fieldName}" трябва да бъде true или false.`);
}

function buildUserView(user) {
  return serializeUserView(user);
}

function throwDuplicateUserError(error) {
  const duplicateError = createDuplicateUserConflictError(error);

  if (duplicateError) {
    throw duplicateError;
  }

  throw error;
}

async function requireExistingUser(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw createHttpError(404, 'Потребителят не беше намерен.');
  }

  return user;
}

async function ensureUniqueEmail(email, currentUserId = '') {
  const existingUser = await findUserByEmail(email);

  if (existingUser && serializeUserView(existingUser).id !== currentUserId) {
    throw createHttpError(409, 'Този имейл адрес вече е регистриран.');
  }
}

async function ensureUniqueUsername(username, currentUserId = '') {
  const existingUser = await findUserByUsername(username);

  if (existingUser && serializeUserView(existingUser).id !== currentUserId) {
    throw createHttpError(409, 'Това потребителско име вече се използва.');
  }
}

function normalizeSelfProfilePayload(payload) {
  assertBodyObject(payload, { allowEmpty: true });
  assertAllowedFields(payload, [...USER_SELF_EDITABLE_FIELDS, 'currentPassword']);
  assertNonEmptyPayload(payload);

  const normalizedPayload = {};
  const normalizedSecurity = {};

  if (payload.firstName !== undefined) {
    normalizedPayload.firstName = normalizeOptionalName(payload.firstName, 'firstName');
  }

  if (payload.lastName !== undefined) {
    normalizedPayload.lastName = normalizeOptionalName(payload.lastName, 'lastName');
  }

  if (payload.email !== undefined) {
    normalizedPayload.email = normalizeOptionalEmail(payload.email);
  }

  if (payload.currentPassword !== undefined) {
    normalizedSecurity.currentPassword = normalizePassword(payload.currentPassword);
    if (!isPasswordWithinBcryptLimit(normalizedSecurity.currentPassword)) {
      throw createHttpError(400, `Полето "currentPassword" може да бъде най-много ${USER_PASSWORD_MAX_BYTES} UTF-8 байта.`);
    }
  }

  assertNonEmptyPayload(normalizedPayload);
  return {
    changes: normalizedPayload,
    security: normalizedSecurity,
  };
}

function normalizePasswordChangePayload(payload) {
  assertBodyObject(payload, { allowEmpty: true });
  assertAllowedFields(payload, ['currentPassword', 'newPassword', 'confirmPassword']);

  const currentPassword = normalizeRequiredPassword(payload.currentPassword, 'currentPassword');
  const newPassword = normalizeRequiredPassword(payload.newPassword, 'newPassword');
  const confirmPassword = normalizeRequiredPassword(payload.confirmPassword, 'confirmPassword');

  assertStrongPassword(newPassword);

  if (newPassword !== confirmPassword) {
    throw createHttpError(400, 'Новата парола и потвърждението не съвпадат.');
  }

  if (currentPassword === newPassword) {
    throw createHttpError(409, 'Новата парола трябва да е различна от текущата.');
  }

  return {
    currentPassword,
    newPassword,
  };
}

function normalizeEmployeeCreatePayload(payload) {
  assertBodyObject(payload, { allowEmpty: true });
  assertAllowedFields(payload, USER_EMPLOYEE_CREATE_FIELDS);

  const firstName = normalizeRequiredName(payload.firstName, 'firstName');
  const lastName = normalizeRequiredName(payload.lastName, 'lastName');
  const username = normalizeRequiredUsername(payload.username);
  const email = normalizeRequiredEmail(payload.email);
  const password = normalizeRequiredPassword(payload.password);
  const confirmPassword = normalizeRequiredPassword(payload.confirmPassword, 'confirmPassword');
  const role = 'employee';
  const isActive = payload.isActive === undefined ? true : parseBooleanField(payload.isActive, 'isActive');

  assertStrongPassword(password);

  if (password !== confirmPassword) {
    throw createHttpError(400, 'Паролата и потвърждението не съвпадат.');
  }

  return {
    firstName,
    lastName,
    username,
    email,
    password,
    role,
    isActive,
  };
}

function normalizeManagedUserProfilePayload(payload) {
  assertBodyObject(payload, { allowEmpty: true });
  assertAllowedFields(payload, USER_ADMIN_PROFILE_EDITABLE_FIELDS);
  assertNonEmptyPayload(payload);

  const normalizedPayload = {};

  if (payload.firstName !== undefined) {
    normalizedPayload.firstName = normalizeOptionalName(payload.firstName, 'firstName');
  }

  if (payload.lastName !== undefined) {
    normalizedPayload.lastName = normalizeOptionalName(payload.lastName, 'lastName');
  }

  if (payload.email !== undefined) {
    normalizedPayload.email = normalizeOptionalEmail(payload.email);
  }

  if (payload.role !== undefined) {
    normalizedPayload.role = normalizeManagedRole(payload.role);
  }

  assertNonEmptyPayload(normalizedPayload);
  return normalizedPayload;
}

function normalizeAdminStatusPayload(payload) {
  assertBodyObject(payload, { allowEmpty: true });
  assertAllowedFields(payload, USER_ADMIN_STATUS_EDITABLE_FIELDS);
  assertNonEmptyPayload(payload, 'Не са подадени данни за промяна на статуса.');

  const hasExplicitIsActive = Object.prototype.hasOwnProperty.call(payload, 'isActive');

  if (!hasExplicitIsActive) {
    throw createHttpError(400, 'Необходимо е да подадеш "isActive".');
  }

  return {
    isActive: parseBooleanField(payload.isActive, 'isActive'),
  };
}

function normalizeUserFilters(filters = {}) {
  const role = normalizeLookupText(filters.role);
  const status = normalizeLookupText(filters.status);
  const search = normalizeText(filters.search);

  if (role && !MANAGED_USER_ROLE_VALUES.includes(role)) {
    throw createHttpError(400, 'Параметърът "role" съдържа невалидна стойност.', {
      allowedRoles: MANAGED_USER_ROLE_VALUES,
    });
  }

  if (status && !USER_STATUS_VALUES.includes(status)) {
    throw createHttpError(400, 'Параметърът "status" съдържа невалидна стойност.', {
      allowedStatuses: USER_STATUS_VALUES,
    });
  }

  return {
    role,
    status,
    search,
    page: filters.page,
    limit: filters.limit,
  };
}

function assertAdminUsesProfilePageForOwnProfile(targetUser, currentUser) {
  if (serializeUserView(targetUser).id !== currentUser?.id) {
    return;
  }

  throw createHttpError(
    409,
    'За промяна на собствения профил използвай страницата "Моят профил".'
  );
}

function assertAdminCanManageOwnStatus(targetUser, currentUser, nextIsActive) {
  if (serializeUserView(targetUser).id !== currentUser?.id) {
    return;
  }

  if (nextIsActive === false) {
    throw createHttpError(409, 'Не можеш да деактивираш собствения си администраторски профил.');
  }
}

export async function getCurrentUserProfile(currentUser) {
  return buildUserView(currentUser);
}

export async function updateCurrentUserProfile(payload, currentUser) {
  const existingUser = await requireExistingUser(currentUser.id);
  const { changes, security } = normalizeSelfProfilePayload(payload);
  const isEmailChange =
    changes.email !== undefined &&
    changes.email !== normalizeLookupText(existingUser.email);

  if (isEmailChange) {
    if (!security.currentPassword) {
      throw createHttpError(400, 'Въведи текущата си парола, за да смениш имейла.');
    }

    const isCurrentPasswordValid = await verifyPassword(
      security.currentPassword,
      existingUser.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw createHttpError(400, 'Текущата парола е невалидна.');
    }

    await ensureUniqueEmail(changes.email, currentUser.id);
  }

  let updatedUser = null;

  try {
    updatedUser = await updateUserById(currentUser.id, changes);
  } catch (error) {
    throwDuplicateUserError(error);
  }

  return buildUserView(updatedUser ?? existingUser);
}

export async function changeCurrentUserPassword(payload, currentUser) {
  const existingUser = await requireExistingUser(currentUser.id);
  const normalizedPayload = normalizePasswordChangePayload(payload);
  const isCurrentPasswordValid = await verifyPassword(
    normalizedPayload.currentPassword,
    existingUser.passwordHash
  );

  if (!isCurrentPasswordValid) {
    throw createHttpError(400, 'Текущата парола е невалидна.');
  }

  const updatedUser = await updateUserById(
    currentUser.id,
    {
      passwordHash: await hashPassword(normalizedPayload.newPassword),
    },
    {
      incrementAuthVersion: true,
    }
  );
  const nextUser = updatedUser ?? existingUser;

  return {
    user: buildUserView(nextUser),
    token: createAuthToken(nextUser),
  };
}

export async function getAdminUsersCollection(filters = {}) {
  const normalizedFilters = normalizeUserFilters(filters);
  const userCollection = await listUsers(normalizedFilters);

  return {
    items: userCollection.items.map(buildUserView),
    total: userCollection.total,
    summary: userCollection.summary,
    pagination: userCollection.pagination,
    filters: {
      role: normalizedFilters.role,
      status: normalizedFilters.status,
      search: normalizedFilters.search,
    },
  };
}

export async function getAdminUserDetailsById(userId) {
  const user = await requireExistingUser(userId);
  return buildUserView(user);
}

export async function createEmployeeUser(payload) {
  const normalizedPayload = normalizeEmployeeCreatePayload(payload);

  await ensureUniqueUsername(normalizedPayload.username);
  await ensureUniqueEmail(normalizedPayload.email);

  let createdUser = null;

  try {
    createdUser = await createUser({
      firstName: normalizedPayload.firstName,
      lastName: normalizedPayload.lastName,
      username: normalizedPayload.username,
      email: normalizedPayload.email,
      passwordHash: await hashPassword(normalizedPayload.password),
      role: normalizedPayload.role,
      isActive: normalizedPayload.isActive,
    });
  } catch (error) {
    throwDuplicateUserError(error);
  }

  return buildUserView(createdUser);
}

export async function updateManagedUser(userId, payload, currentUser) {
  const existingUser = await requireExistingUser(userId);
  const normalizedPayload = normalizeManagedUserProfilePayload(payload);

  assertAdminUsesProfilePageForOwnProfile(existingUser, currentUser);

  if (normalizedPayload.email) {
    await ensureUniqueEmail(normalizedPayload.email, serializeUserView(existingUser).id);
  }

  let updatedUser = null;

  try {
    updatedUser = await updateUserById(serializeUserView(existingUser).id, normalizedPayload);
  } catch (error) {
    throwDuplicateUserError(error);
  }

  return buildUserView(updatedUser ?? existingUser);
}

export async function updateManagedUserStatus(userId, payload, currentUser) {
  const existingUser = await requireExistingUser(userId);
  const normalizedPayload = normalizeAdminStatusPayload(payload);

  assertAdminCanManageOwnStatus(existingUser, currentUser, normalizedPayload.isActive);

  const shouldInvalidateSessions = Boolean(existingUser.isActive) && normalizedPayload.isActive === false;
  const updatedUser = await updateUserById(
    serializeUserView(existingUser).id,
    {
      isActive: normalizedPayload.isActive,
    },
    {
      incrementAuthVersion: shouldInvalidateSessions,
    }
  );

  return buildUserView(updatedUser ?? existingUser);
}
