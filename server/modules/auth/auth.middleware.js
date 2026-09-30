import { createHttpError } from '../../utils/httpError.js';
import { findUserById, serializeUserView } from '../users/users.repository.js';
import { hasPermission } from '../shared/rolePolicies.js';
import { AUTH_COOKIE_NAME, getAuthCookieClearOptions, verifyAuthToken } from './auth.security.js';

function extractAuthToken(req) {
  const authCookie = String(req.headers.cookie ?? '')
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.slice(0, chunk.indexOf('=')).trim() === AUTH_COOKIE_NAME);

  if (!authCookie) {
    return { token: '', isMalformed: false };
  }

  const encodedValue = authCookie.slice(authCookie.indexOf('=') + 1).trim();

  try {
    return {
      token: decodeURIComponent(encodedValue),
      isMalformed: false,
    };
  } catch {
    return { token: '', isMalformed: true };
  }
}

function resetAuthContext(req) {
  req.user = null;
  req.authFailureReason = '';
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieClearOptions());
}

function isAuthVersionValid(tokenPayload, user) {
  const tokenVersion = Number(tokenPayload?.ver ?? 0);
  const userVersion = Number(user?.authVersion ?? 0);

  return Number.isInteger(tokenVersion) && tokenVersion === userVersion;
}

function buildUnauthorizedError(req) {
  if (req.authFailureReason === 'inactive') {
    return createHttpError(
      401,
      'Профилът ти е деактивиран. Свържи се с администратор, ако смяташ, че това е грешка.'
    );
  }

  if (req.authFailureReason === 'invalid') {
    return createHttpError(401, 'Сесията е невалидна или е изтекла. Влез отново, за да продължиш.');
  }

  return createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш този ресурс.');
}

export async function attachCurrentUser(req, res, next) {
  resetAuthContext(req);

  const { token: authToken, isMalformed } = extractAuthToken(req);

  if (isMalformed) {
    req.authFailureReason = 'invalid';
    clearAuthCookie(res);
    return next();
  }

  if (!authToken) {
    return next();
  }

  let tokenPayload = null;

  try {
    tokenPayload = verifyAuthToken(authToken);
  } catch {
    req.authFailureReason = 'invalid';
    clearAuthCookie(res);
    return next();
  }

  try {
    const user = await findUserById(tokenPayload.sub);

    if (!user) {
      req.authFailureReason = 'invalid';
      clearAuthCookie(res);
      return next();
    }

    if (!user.isActive) {
      req.authFailureReason = 'inactive';
      clearAuthCookie(res);
      return next();
    }

    if (!isAuthVersionValid(tokenPayload, user)) {
      req.authFailureReason = 'invalid';
      clearAuthCookie(res);
      return next();
    }

    req.user = serializeUserView(user);
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return next(buildUnauthorizedError(req));
  }

  return next();
}

export function permissionMiddleware(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return next(buildUnauthorizedError(req));
    }

    if (!hasPermission(req.user.role, resource, action)) {
      return next(createHttpError(403, 'Нямаш необходимите права за това действие.'));
    }

    return next();
  };
}
