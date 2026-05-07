import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const AUTH_COOKIE_NAME = 'animal_shelter_auth';

const DEFAULT_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const REMEMBER_ME_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_JWT_SECRET = 'animal-shelter-local-development-secret';
const PASSWORD_SALT_ROUNDS = 10;

function getJwtSecret() {
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

function getTokenTtl(rememberMe = false) {
  return rememberMe ? '30d' : '12h';
}

function getTokenTtlMs(rememberMe = false) {
  return rememberMe ? REMEMBER_ME_TOKEN_TTL_MS : DEFAULT_TOKEN_TTL_MS;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
  if (!password || !passwordHash) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

export function createAuthToken(user, options = {}) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      type: 'access',
    },
    getJwtSecret(),
    {
      expiresIn: getTokenTtl(options.rememberMe),
    }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function getAuthCookieOptions(rememberMe = false) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getTokenTtlMs(rememberMe),
  };
}

export function getAuthCookieClearOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
