import { createHttpError } from './httpError.js';
import { isPlainObject } from './object.js';

export function assertBodyObject(payload, { allowEmpty = false } = {}) {
  if (!isPlainObject(payload)) {
    throw createHttpError(400, 'Тялото на заявката трябва да бъде JSON обект.');
  }

  if (!allowEmpty && Object.keys(payload).length === 0) {
    throw createHttpError(400, 'Тялото на заявката не може да бъде празно.');
  }
}

export function assertAllowedFields(payload, allowedFields, message = 'Заявката съдържа неподдържани полета.') {
  const allowedFieldSet = new Set(allowedFields);
  const invalidFields = Object.keys(payload).filter((fieldName) => !allowedFieldSet.has(fieldName));

  if (invalidFields.length > 0) {
    throw createHttpError(400, message, {
      invalidFields,
      allowedFields,
    });
  }
}
