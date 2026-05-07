import { createHttpError } from '../../utils/httpError.js';
import { findUserById, serializePublicUser } from '../users/users.repository.js';
import { hasPermission } from '../shared/rolePolicies.js';
import { AUTH_COOKIE_NAME, getAuthCookieClearOptions, verifyAuthToken } from './auth.security.js';

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((cookieMap, chunk) => {
      const separatorIndex = chunk.indexOf('=');

      if (separatorIndex === -1) {
        return cookieMap;
      }

      const key = chunk.slice(0, separatorIndex).trim();
      const value = chunk.slice(separatorIndex + 1).trim();
      cookieMap[key] = decodeURIComponent(value);
      return cookieMap;
    }, {});
}

function extractBearerToken(authorizationHeader = '') {
  const [scheme, token] = String(authorizationHeader).trim().split(/\s+/);

  if (!/^Bearer$/i.test(scheme) || !token) {
    return '';
  }

  return token;
}

function extractAuthToken(req) {
  const headerToken = extractBearerToken(req.headers.authorization);

  if (headerToken) {
    return {
      token: headerToken,
      source: 'header',
    };
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[AUTH_COOKIE_NAME] ?? '';

  if (cookieToken) {
    return {
      token: cookieToken,
      source: 'cookie',
    };
  }

  return {
    token: '',
    source: null,
  };
}

function resetAuthContext(req) {
  req.user = null;
  req.authToken = '';
  req.authTokenSource = null;
  req.authFailureReason = '';
}

function clearAuthCookieIfNeeded(res, authContext) {
  if (authContext?.source === 'cookie') {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieClearOptions());
  }
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
  try {
    resetAuthContext(req);

    const authContext = extractAuthToken(req);

    if (!authContext.token) {
      return next();
    }

    const tokenPayload = verifyAuthToken(authContext.token);
    const user = await findUserById(tokenPayload.sub);

    if (!user) {
      req.authFailureReason = 'invalid';
      clearAuthCookieIfNeeded(res, authContext);
      return next();
    }

    if (!user.isActive) {
      req.authFailureReason = 'inactive';
      clearAuthCookieIfNeeded(res, authContext);
      return next();
    }

    req.user = serializePublicUser(user);
    req.authToken = authContext.token;
    req.authTokenSource = authContext.source;
    return next();
  } catch {
    const authContext = extractAuthToken(req);
    resetAuthContext(req);
    req.authFailureReason = authContext.token ? 'invalid' : '';
    clearAuthCookieIfNeeded(res, authContext);
    return next();
  }
}

export function authMiddleware(req, res, next) {
  if (!req.user) {
    return next(buildUnauthorizedError(req));
  }

  return next();
}

export function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(buildUnauthorizedError(req));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createHttpError(403, 'Нямаш необходимите права за този ресурс.'));
    }

    return next();
  };
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

export const requireAuth = authMiddleware;
export const requireRole = roleMiddleware;
export const requirePermission = permissionMiddleware;
