import {
  EMAIL_PATTERN,
  USER_EMAIL_MAX_LENGTH,
  USER_FIRST_NAME_MAX_LENGTH,
  USER_LAST_NAME_MAX_LENGTH,
  USER_PASSWORD_MAX_BYTES,
  USER_PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '../../../shared/domain/userConstants.js';
import { createHttpError } from '../../utils/httpError.js';
import { assertAllowedFields, assertBodyObject } from '../../utils/requestValidation.js';
import {
  isPasswordWithinBcryptLimit,
  isStrongPassword,
} from '../../utils/userValidation.js';
import { normalizeRole } from '../shared/rolePolicies.js';
import { createDuplicateUserConflictError } from '../shared/userDuplicateErrors.js';
import {
  createUser,
  findUserByEmail,
  findUserByIdentifier,
  findUserByUsername,
  serializeUserView,
  updateUserById,
} from '../users/users.repository.js';
import { createAuthToken, hashPassword, verifyPassword } from './auth.security.js';

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

function parseOptionalBoolean(value, fieldName) {
  if (value === undefined) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  throw createHttpError(400, `Полето "${fieldName}" трябва да бъде булева стойност.`);
}

function buildAuthPayload(user) {
  const serializedUser = user ? serializeUserView(user) : null;

  return {
    authenticated: Boolean(serializedUser),
    role: serializedUser?.role ?? 'guest',
    user: serializedUser,
  };
}

function getPasswordPolicyMessage() {
  return `Паролата трябва да е поне ${USER_PASSWORD_MIN_LENGTH} символа, да бъде до ${USER_PASSWORD_MAX_BYTES} UTF-8 байта и да съдържа поне една буква и една цифра.`;
}

function validateLoginInput(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, ['identifier', 'password', 'rememberMe']);

  const identifier = normalizeText(payload.identifier);
  const password = normalizePassword(payload.password);

  if (!identifier || !password) {
    throw createHttpError(400, 'Попълни потребителско име или имейл и парола.');
  }

  assertMaxLength(
    identifier,
    USER_EMAIL_MAX_LENGTH,
    `Потребителското име или имейлът може да бъде най-много ${USER_EMAIL_MAX_LENGTH} символа.`
  );
  if (!isPasswordWithinBcryptLimit(password)) {
    throw createHttpError(400, `Паролата може да бъде най-много ${USER_PASSWORD_MAX_BYTES} UTF-8 байта.`);
  }

  return {
    identifier,
    password,
    rememberMe: parseOptionalBoolean(payload.rememberMe, 'rememberMe'),
  };
}

function validateRegistrationInput(payload) {
  assertBodyObject(payload);
  assertAllowedFields(payload, [
    'firstName',
    'lastName',
    'username',
    'email',
    'password',
    'confirmPassword',
    'acceptTerms',
  ]);

  const firstName = normalizeText(payload.firstName);
  const lastName = normalizeText(payload.lastName);
  const username = normalizeText(payload.username).toLowerCase();
  const email = normalizeText(payload.email).toLowerCase();
  const password = normalizePassword(payload.password);
  const confirmPassword = normalizePassword(payload.confirmPassword);

  if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
    throw createHttpError(400, 'Попълни всички задължителни полета за регистрация.');
  }

  assertMaxLength(
    firstName,
    USER_FIRST_NAME_MAX_LENGTH,
    `Името може да бъде най-много ${USER_FIRST_NAME_MAX_LENGTH} символа.`
  );
  assertMaxLength(
    lastName,
    USER_LAST_NAME_MAX_LENGTH,
    `Фамилията може да бъде най-много ${USER_LAST_NAME_MAX_LENGTH} символа.`
  );

  if (!USERNAME_PATTERN.test(username)) {
    throw createHttpError(
      400,
      `Потребителското име трябва да е между ${USERNAME_MIN_LENGTH} и ${USERNAME_MAX_LENGTH} символа и може да съдържа букви, цифри, точка, тире и долна черта.`
    );
  }

  assertMaxLength(
    email,
    USER_EMAIL_MAX_LENGTH,
    `Имейл адресът може да бъде най-много ${USER_EMAIL_MAX_LENGTH} символа.`
  );

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (
    !isPasswordWithinBcryptLimit(confirmPassword) ||
    !isStrongPassword(password)
  ) {
    throw createHttpError(400, getPasswordPolicyMessage());
  }

  if (password !== confirmPassword) {
    throw createHttpError(400, 'Полетата за парола не съвпадат.');
  }

  if (payload.acceptTerms !== true) {
    throw createHttpError(400, 'Необходимо е да приемеш условията за ползване.');
  }

  return {
    firstName,
    lastName,
    username,
    email,
    password,
  };
}

async function ensureUniqueUser(username, email) {
  const existingUserByUsername = await findUserByUsername(username);

  if (existingUserByUsername) {
    throw createHttpError(409, 'Това потребителско име вече се използва.');
  }

  const existingUserByEmail = await findUserByEmail(email);

  if (existingUserByEmail) {
    throw createHttpError(409, 'Този имейл адрес вече е регистриран.');
  }
}

export function getAuthStatusPayload(currentUser) {
  return buildAuthPayload(currentUser);
}

export async function loginUser(payload) {
  const { identifier, password, rememberMe } = validateLoginInput(payload);
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    throw createHttpError(401, 'Невалидно потребителско име, имейл или парола.');
  }

  if (!user.isActive) {
    throw createHttpError(
      403,
      'Профилът ти е деактивиран. Свържи се с администратор, ако смяташ, че това е грешка.'
    );
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw createHttpError(401, 'Невалидно потребителско име, имейл или парола.');
  }

  const updatedUser =
    (await updateUserById(
      serializeUserView(user).id,
      {
        lastLoginAt: new Date().toISOString(),
      },
      {
        timestamps: false,
      }
    )) ?? user;

  const authUser = serializeUserView(updatedUser);

  return {
    data: buildAuthPayload(authUser),
    message: 'Входът е успешен.',
    token: createAuthToken(updatedUser ?? user, { rememberMe }),
    rememberMe,
  };
}

export async function registerUser(payload) {
  const { firstName, lastName, username, email, password } = validateRegistrationInput(payload);

  await ensureUniqueUser(username, email);

  let createdUser = null;

  try {
    createdUser = await createUser({
      firstName,
      lastName,
      username,
      email,
      passwordHash: await hashPassword(password),
      role: normalizeRole('client'),
      isActive: true,
    });
  } catch (error) {
    const duplicateError = createDuplicateUserConflictError(error);

    if (duplicateError) {
      throw duplicateError;
    }

    throw error;
  }

  const authUser = serializeUserView(createdUser);

  return {
    data: buildAuthPayload(authUser),
    message: 'Регистрацията е успешна.',
    token: createAuthToken(createdUser),
    rememberMe: false,
  };
}

export function getLogoutPayload() {
  return buildAuthPayload(null);
}
