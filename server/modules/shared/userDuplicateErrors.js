import { createDuplicateKeyHttpError } from '../../utils/mongoErrors.js';

const USER_DUPLICATE_FIELD_MESSAGES = Object.freeze({
  username: 'Това потребителско име вече се използва.',
  email: 'Този имейл адрес вече е регистриран.',
});

export function createDuplicateUserConflictError(error) {
  return createDuplicateKeyHttpError(error, {
    fieldMessages: USER_DUPLICATE_FIELD_MESSAGES,
    fallbackMessage: 'Потребител с тези данни вече съществува.',
  });
}
