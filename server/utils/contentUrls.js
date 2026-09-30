import { createHttpError } from './httpError.js';

const MAX_URL_LENGTH = 512;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function isValidHttpUrl(value) {
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return ['http:', 'https:'].includes(parsedUrl.protocol) && Boolean(parsedUrl.hostname);
  } catch {
    return false;
  }
}

function normalizeUrl(
  value,
  {
    fieldName = 'URL',
    allowEmpty = true,
    allowInternalPath = true,
    allowAnchor = true,
    allowPublicPath = false,
    allowHttp = true,
    strict = true,
  } = {}
) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue && allowEmpty) {
    return '';
  }

  if (normalizedValue.length > MAX_URL_LENGTH) {
    if (strict) {
      throw createHttpError(400, `${fieldName} е твърде дълго поле.`);
    }

    return '';
  }

  const isInternalPath =
    normalizedValue.startsWith('/') && !normalizedValue.startsWith('//');
  const isAllowedUrl =
    (allowInternalPath && isInternalPath) ||
    (allowAnchor && normalizedValue.startsWith('#')) ||
    (allowPublicPath && normalizedValue.startsWith('images/')) ||
    (allowHttp && isValidHttpUrl(normalizedValue));

  if (!isAllowedUrl && strict) {
    throw createHttpError(
      400,
      `${fieldName} трябва да бъде валиден вътрешен адрес, публичен път или http(s) URL.`
    );
  }

  return isAllowedUrl ? normalizedValue : '';
}

export function normalizeContentUrl(value, options = {}) {
  return normalizeUrl(value, options);
}

export function normalizeImageUrl(value, options = {}) {
  return normalizeUrl(value, {
    fieldName: 'Пътят до снимката',
    allowAnchor: false,
    allowPublicPath: true,
    ...options,
  });
}

export function normalizeExternalUrl(value, options = {}) {
  return normalizeUrl(value, {
    fieldName: 'URL адресът',
    allowInternalPath: false,
    allowAnchor: false,
    allowPublicPath: false,
    ...options,
  });
}

export function assertImageAltText(imageAlt, imageUrl, { fieldName = 'Alt текстът', strict = true } = {}) {
  const normalizedImageAlt = normalizeText(imageAlt);

  if (imageUrl && !normalizedImageAlt && strict) {
    throw createHttpError(400, `${fieldName} е задължителен, когато има снимка.`);
  }

  return normalizedImageAlt;
}
