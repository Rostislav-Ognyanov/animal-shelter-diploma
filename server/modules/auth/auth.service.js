import { createHttpError } from '../../utils/httpError.js';
import { normalizeRole } from '../shared/rolePolicies.js';
import { createAuthToken, hashPassword, verifyPassword } from './auth.security.js';
import {
  createUser,
  findUserByEmail,
  findUserByIdentifier,
  findUserByUsername,
  serializePublicUser,
  updateUserById,
} from '../users/users.repository.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function buildAuthPayload(user) {
  const serializedUser = user ? serializePublicUser(user) : null;

  return {
    authenticated: Boolean(serializedUser),
    role: serializedUser?.role ?? 'guest',
    user: serializedUser,
  };
}

function validatePasswordStrength(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function validateLoginInput(payload) {
  const identifier = normalizeText(payload.username || payload.identifier);
  const password = normalizeText(payload.password);

  if (!identifier || !password) {
    throw createHttpError(400, 'Попълни потребителско име и парола.');
  }

  return {
    identifier,
    password,
    rememberMe: Boolean(payload.rememberMe),
  };
}

function validateRegistrationInput(payload) {
  const firstName = normalizeText(payload.firstName);
  const lastName = normalizeText(payload.lastName);
  const username = normalizeText(payload.username).toLowerCase();
  const email = normalizeText(payload.email).toLowerCase();
  const password = normalizeText(payload.password);
  const confirmPassword = normalizeText(payload.confirmPassword);
  const acceptTerms = Boolean(payload.acceptTerms);

  if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
    throw createHttpError(400, 'Попълни всички задължителни полета за регистрация.');
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw createHttpError(
      400,
      'Потребителското име трябва да е между 3 и 32 символа и може да съдържа букви, цифри, точка, тире и долна черта.'
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Въведи валиден имейл адрес.');
  }

  if (!validatePasswordStrength(password)) {
    throw createHttpError(
      400,
      'Паролата трябва да е поне 8 символа и да съдържа поне една буква и една цифра.'
    );
  }

  if (password !== confirmPassword) {
    throw createHttpError(400, 'Полетата за парола не съвпадат.');
  }

  if (!acceptTerms) {
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
    throw createHttpError(401, 'Невалидно потребителско име или парола.');
  }

  if (!user.isActive) {
    throw createHttpError(
      403,
      'Профилът ти е деактивиран. Свържи се с администратор, ако смяташ, че това е грешка.'
    );
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw createHttpError(401, 'Невалидно потребителско име или парола.');
  }

  const updatedUser =
    (await updateUserById(serializePublicUser(user).id, {
      lastLoginAt: new Date().toISOString(),
    })) ?? user;

  const authUser = serializePublicUser(updatedUser);

  return {
    data: buildAuthPayload(authUser),
    message: 'Входът е успешен.',
    token: createAuthToken(authUser, { rememberMe }),
    rememberMe,
  };
}

export async function registerUser(payload) {
  const { firstName, lastName, username, email, password } = validateRegistrationInput(payload);

  await ensureUniqueUser(username, email);

  const createdUser = await createUser({
    firstName,
    lastName,
    username,
    email,
    passwordHash: await hashPassword(password),
    role: normalizeRole('client'),
    isActive: true,
  });

  const authUser = serializePublicUser(createdUser);

  return {
    data: buildAuthPayload(authUser),
    message: 'Регистрацията е успешна.',
    token: createAuthToken(authUser),
    rememberMe: false,
  };
}

export function getLogoutPayload() {
  return buildAuthPayload(null);
}
