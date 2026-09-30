import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { serializeId } from '../../utils/serialization.js';

export const AUTH_COOKIE_NAME = 'animal_shelter_auth';

const REMEMBER_ME_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_SALT_ROUNDS = 10;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET is required.');
  }

  return secret;
}

const JWT_SECRET = getJwtSecret();

function getTokenTtl(rememberMe = false) {
  return rememberMe ? '30d' : '12h';
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
  const authVersion = Number(user?.authVersion ?? 0);

  // Security-sensitive user updates increment authVersion, making all previously issued tokens stale.
  return jwt.sign(
    {
      sub: serializeId(user),
      ver: Number.isInteger(authVersion) ? authVersion : 0,
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: getTokenTtl(options.rememberMe),
    }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  });
}

export function getAuthCookieOptions(rememberMe = false) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  if (rememberMe) {
    cookieOptions.maxAge = REMEMBER_ME_TOKEN_TTL_MS;
  }

  return cookieOptions;
}

export function getAuthCookieClearOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
