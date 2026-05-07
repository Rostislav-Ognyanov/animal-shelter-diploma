import { createHttpError } from '../../utils/httpError.js';
import { hashPassword, verifyPassword } from '../auth/auth.security.js';
import { normalizeRole } from '../shared/rolePolicies.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  listUsers,
  serializePublicUser,
  updateUserById,
} from './users.repository.js';
import {
  ADMIN_CREATABLE_USER_ROLE_VALUES,
  MANAGED_USER_ROLE_VALUES,
  USER_ADMIN_EDITABLE_FIELDS,
  USER_ADMIN_PROFILE_FIELDS,
  USER_EMPLOYEE_CREATE_FIELDS,
  USER_SELF_EDITABLE_FIELDS,
  USER_STATUS_EDITABLE_FIELDS,
  USER_STATUS_VALUES,
} from './user.constants.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLookupText(value) {
  return normalizeText(value).toLowerCase();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertBodyObject(payload) {
  if (!isPlainObject(payload)) {
    throw createHttpError(400, 'Тялото на заявката трябва да бъде JSON обект.');
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

function assertNonEmptyPayload(payload, message = 'Не са подадени данни за обновяване.') {
  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, message);
  }
}

function normalizeRequiredName(value, fieldName) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    throw createHttpError(400, `Полето "${fieldName}" е задължително.`);
  }

  return normalizedValue;
}

function normalizeOptionalName(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    throw createHttpError(400, `Полето "${fieldName}" не може да бъде празно.`);
  }

  return normalizedValue;
}

function normalizeRequiredEmail(value) {
  const normalizedValue = normalizeLookupText(value);

  if (!normalizedValue) {
    throw createHttpError(400, 'Полето "email" е задължително.');
  }

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
      'Потребителското име трябва да е между 3 и 32 символа и може да съдържа букви, цифри, точка, тире и долна черта.'
    );
  }

  return normalizedValue;
}

function validatePasswordStrength(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function normalizeRequiredPassword(value, fieldName = 'password') {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    throw createHttpError(400, `Полето "${fieldName}" е задължително.`);
  }

  return normalizedValue;
}

function assertStrongPassword(password) {
  if (!validatePasswordStrength(password)) {
    throw createHttpError(
      400,
      'Паролата трябва да е поне 8 символа и да съдържа поне една буква и една цифра.'
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

  const normalizedValue = normalizeLookupText(value);

  if (['true', '1', 'yes', 'on', 'active', 'активен'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', 'off', 'inactive', 'неактивен'].includes(normalizedValue)) {
    return false;
  }

  throw createHttpError(400, `Полето "${fieldName}" трябва да бъде true или false.`);
}

function normalizeUserStatus(value) {
  const normalizedValue = normalizeLookupText(value);

  if (!USER_STATUS_VALUES.includes(normalizedValue)) {
    throw createHttpError(400, 'Полето "status" съдържа невалидна стойност.', {
      allowedStatuses: USER_STATUS_VALUES,
    });
  }

  return normalizedValue;
}

function buildUserView(user) {
  const serializedUser = serializePublicUser(user);

  return {
    ...serializedUser,
    fullName: `${serializedUser.firstName} ${serializedUser.lastName}`.trim(),
  };
}

function getViewerCapabilities(roleCandidate) {
  const normalizedRole = normalizeRole(roleCandidate);
  const isAdmin = normalizedRole === 'admin';

  return {
    role: normalizedRole,
    canViewOwnProfile: normalizedRole !== 'guest',
    canEditOwnProfile: normalizedRole !== 'guest',
    canChangeOwnPassword: normalizedRole !== 'guest',
    canListUsers: isAdmin,
    canViewUserDetails: isAdmin,
    canCreateEmployee: isAdmin,
    canManageRoles: isAdmin,
    canManageUserStatus: isAdmin,
  };
}

export function getUsersModulePolicy(roleCandidate) {
  return {
    resource: 'users',
    managedRoles: MANAGED_USER_ROLE_VALUES,
    selfEditableFields: USER_SELF_EDITABLE_FIELDS,
    adminEditableFields: USER_ADMIN_EDITABLE_FIELDS,
    adminCreatableRoles: ADMIN_CREATABLE_USER_ROLE_VALUES,
    statusValues: USER_STATUS_VALUES,
    rules: {
      selfProfileOnly: true,
      adminCanListAllUsers: true,
      adminCanCreateEmployeesOnly: true,
      adminControlsRoleAndStatus: true,
      deactivatedUsersCannotAuthenticate: true,
    },
    capabilities: getViewerCapabilities(roleCandidate),
  };
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

  if (existingUser && serializePublicUser(existingUser).id !== currentUserId) {
    throw createHttpError(409, 'Този имейл адрес вече е регистриран.');
  }
}

async function ensureUniqueUsername(username, currentUserId = '') {
  const existingUser = await findUserByUsername(username);

  if (existingUser && serializePublicUser(existingUser).id !== currentUserId) {
    throw createHttpError(409, 'Това потребителско име вече се използва.');
  }
}

function normalizeSelfProfilePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, USER_SELF_EDITABLE_FIELDS);
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

  assertNonEmptyPayload(normalizedPayload);
  return normalizedPayload;
}

function normalizePasswordChangePayload(payload) {
  assertBodyObject(payload);
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
  assertBodyObject(payload);
  assertAllowedFields(payload, USER_EMPLOYEE_CREATE_FIELDS);

  const firstName = normalizeRequiredName(payload.firstName, 'firstName');
  const lastName = normalizeRequiredName(payload.lastName, 'lastName');
  const username = normalizeRequiredUsername(payload.username);
  const email = normalizeRequiredEmail(payload.email);
  const password = normalizeRequiredPassword(payload.password);
  const confirmPassword = normalizeRequiredPassword(payload.confirmPassword, 'confirmPassword');
  const role = payload.role === undefined ? 'employee' : normalizeManagedRole(payload.role);
  const isActive = payload.isActive === undefined ? true : parseBooleanField(payload.isActive, 'isActive');

  assertStrongPassword(password);

  if (password !== confirmPassword) {
    throw createHttpError(400, 'Паролата и потвърждението не съвпадат.');
  }

  if (!ADMIN_CREATABLE_USER_ROLE_VALUES.includes(role)) {
    throw createHttpError(400, 'През този endpoint администраторът може да създава само служители.', {
      allowedRoles: ADMIN_CREATABLE_USER_ROLE_VALUES,
    });
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

function normalizeAdminProfilePayload(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, USER_ADMIN_PROFILE_FIELDS);
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
  assertBodyObject(payload);
  assertAllowedFields(payload, USER_STATUS_EDITABLE_FIELDS);
  assertNonEmptyPayload(payload, 'Не са подадени данни за промяна на статуса.');

  const hasExplicitIsActive = Object.prototype.hasOwnProperty.call(payload, 'isActive');
  const hasStatusAlias = Object.prototype.hasOwnProperty.call(payload, 'status');

  if (!hasExplicitIsActive && !hasStatusAlias) {
    throw createHttpError(400, 'Необходимо е да подадеш "isActive" или "status".');
  }

  const isActiveFromBoolean = hasExplicitIsActive
    ? parseBooleanField(payload.isActive, 'isActive')
    : null;
  const isActiveFromStatus = hasStatusAlias ? normalizeUserStatus(payload.status) === 'active' : null;

  if (
    isActiveFromBoolean !== null &&
    isActiveFromStatus !== null &&
    isActiveFromBoolean !== isActiveFromStatus
  ) {
    throw createHttpError(400, 'Подадените "isActive" и "status" стойности си противоречат.');
  }

  return {
    isActive: isActiveFromBoolean ?? isActiveFromStatus,
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

function assertAdminCanManageOwnRole(targetUser, currentUser, nextRole) {
  if (!nextRole) {
    return;
  }

  if (serializePublicUser(targetUser).id !== currentUser?.id) {
    return;
  }

  if (nextRole !== targetUser.role) {
    throw createHttpError(409, 'Не можеш да променяш собствената си роля през административния панел.');
  }
}

function assertAdminCanManageOwnStatus(targetUser, currentUser, nextIsActive) {
  if (serializePublicUser(targetUser).id !== currentUser?.id) {
    return;
  }

  if (nextIsActive === false) {
    throw createHttpError(409, 'Не можеш да деактивираш собствения си администраторски профил.');
  }
}

export async function getCurrentUserProfile(currentUser) {
  const user = await requireExistingUser(currentUser.id);
  return buildUserView(user);
}

export async function updateCurrentUserProfile(payload, currentUser) {
  const existingUser = await requireExistingUser(currentUser.id);
  const normalizedPayload = normalizeSelfProfilePayload(payload);

  if (normalizedPayload.email) {
    await ensureUniqueEmail(normalizedPayload.email, currentUser.id);
  }

  const updatedUser = await updateUserById(currentUser.id, normalizedPayload);
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

  const updatedUser = await updateUserById(currentUser.id, {
    passwordHash: await hashPassword(normalizedPayload.newPassword),
  });

  return buildUserView(updatedUser ?? existingUser);
}

export async function getAdminUsersCollection(filters = {}) {
  const normalizedFilters = normalizeUserFilters(filters);
  const userCollection = await listUsers(normalizedFilters);

  return {
    items: userCollection.items.map(buildUserView),
    total: userCollection.total,
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

  const createdUser = await createUser({
    firstName: normalizedPayload.firstName,
    lastName: normalizedPayload.lastName,
    username: normalizedPayload.username,
    email: normalizedPayload.email,
    passwordHash: await hashPassword(normalizedPayload.password),
    role: normalizedPayload.role,
    isActive: normalizedPayload.isActive,
  });

  return buildUserView(createdUser);
}

export async function updateManagedUser(userId, payload, currentUser) {
  const existingUser = await requireExistingUser(userId);
  const normalizedPayload = normalizeAdminProfilePayload(payload);

  assertAdminCanManageOwnRole(existingUser, currentUser, normalizedPayload.role);

  if (normalizedPayload.email) {
    await ensureUniqueEmail(normalizedPayload.email, serializePublicUser(existingUser).id);
  }

  const updatedUser = await updateUserById(serializePublicUser(existingUser).id, normalizedPayload);
  return buildUserView(updatedUser ?? existingUser);
}

export async function updateManagedUserStatus(userId, payload, currentUser) {
  const existingUser = await requireExistingUser(userId);
  const normalizedPayload = normalizeAdminStatusPayload(payload);

  assertAdminCanManageOwnStatus(existingUser, currentUser, normalizedPayload.isActive);

  const updatedUser = await updateUserById(serializePublicUser(existingUser).id, {
    isActive: normalizedPayload.isActive,
  });

  return buildUserView(updatedUser ?? existingUser);
}
