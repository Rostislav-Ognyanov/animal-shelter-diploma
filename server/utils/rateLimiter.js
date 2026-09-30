import { createHttpError } from './httpError.js';

const DEFAULT_WINDOW_MS = 1000 * 60 * 15;
const DEFAULT_MAX_ATTEMPTS = 20;

function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown-client';
}

function removeExpiredEntries(attemptsByClient, now) {
  for (const [clientKey, entry] of attemptsByClient) {
    if (entry.resetAt <= now) {
      attemptsByClient.delete(clientKey);
    }
  }
}

export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  message = 'Твърде много опити. Изчакай няколко минути и опитай отново.',
} = {}) {
  const attemptsByClient = new Map();

  return (req, res, next) => {
    const now = Date.now();
    removeExpiredEntries(attemptsByClient, now);

    const clientKey = getClientKey(req);
    const currentEntry = attemptsByClient.get(clientKey);

    if (!currentEntry || currentEntry.resetAt <= now) {
      attemptsByClient.set(clientKey, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    currentEntry.count += 1;

    if (currentEntry.count > maxAttempts) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((currentEntry.resetAt - now) / 1000)
      );

      res.set('Retry-After', String(retryAfterSeconds));
      return next(createHttpError(429, message));
    }

    return next();
  };
}
