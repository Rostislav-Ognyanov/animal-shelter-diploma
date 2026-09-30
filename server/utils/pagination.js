import { createHttpError } from './httpError.js';

function parsePositiveInteger(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw createHttpError(400, `Parameter "${fieldName}" must be a positive integer.`);
  }

  return numericValue;
}

/**
 * Normalizes pagination values from the query string.
 * Invalid values throw an HTTP 400 error, while limit is capped at the configured maximum.
 */
export function normalizePaginationOptions(filters = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? 10;
  const maxLimit = options.maxLimit ?? defaultLimit;
  const requestedLimit = parsePositiveInteger(
    filters.limit ?? filters.pageSize,
    'limit',
    defaultLimit
  );

  return {
    page: parsePositiveInteger(filters.page, 'page', 1),
    limit: Math.min(requestedLimit, maxLimit),
    maxLimit,
  };
}

export function buildPagination(total, options) {
  const effectiveLimit = options.limit || 1;
  const totalPages = total === 0 ? 0 : Math.ceil(total / effectiveLimit);
  const safePage = totalPages === 0 ? 1 : Math.min(options.page, totalPages);

  return {
    page: safePage,
    limit: effectiveLimit,
    maxLimit: options.maxLimit,
    total,
    totalPages,
    hasNextPage: totalPages > 0 && safePage < totalPages,
    hasPreviousPage: totalPages > 0 && safePage > 1,
  };
}

export function applyPagination(query, pagination) {
  return query.skip((pagination.page - 1) * pagination.limit).limit(pagination.limit);
}
