import { createRateLimiter } from '../../utils/rateLimiter.js';

const DEFAULT_WINDOW_MS = 1000 * 60 * 15;
const DEFAULT_MAX_ATTEMPTS = 20;

export function createAuthRateLimiter(options = {}) {
  return createRateLimiter({
    windowMs: DEFAULT_WINDOW_MS,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    message:
      'Твърде много опити. Изчакай няколко минути и опитай отново.',
    ...options,
  });
}
