import { createHttpError } from './httpError.js';

export function isMongoDuplicateKeyError(error) {
  return error?.code === 11000;
}

export function getMongoDuplicateKeyFields(error) {
  const keySource = error?.keyPattern ?? error?.keyValue ?? {};

  if (!keySource || typeof keySource !== 'object') {
    return [];
  }

  return Object.keys(keySource);
}

export function createDuplicateKeyHttpError(
  error,
  {
    fieldMessages = {},
    fallbackMessage = 'Запис с тези данни вече съществува.',
  } = {}
) {
  if (!isMongoDuplicateKeyError(error)) {
    return null;
  }

  const duplicateFields = getMongoDuplicateKeyFields(error);
  const matchedField = duplicateFields.find((fieldName) =>
    Object.prototype.hasOwnProperty.call(fieldMessages, fieldName)
  );

  return createHttpError(
    409,
    matchedField ? fieldMessages[matchedField] : fallbackMessage,
    duplicateFields.length > 0 ? { duplicateFields } : undefined
  );
}
