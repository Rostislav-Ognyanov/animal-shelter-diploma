import {
  USER_PASSWORD_MAX_BYTES,
  USER_PASSWORD_MIN_LENGTH,
} from '../../shared/domain/userConstants.js';

export function getPasswordByteLength(password) {
  return Buffer.byteLength(String(password ?? ''), 'utf8');
}

export function isPasswordWithinBcryptLimit(password) {
  return getPasswordByteLength(password) <= USER_PASSWORD_MAX_BYTES;
}

export function isStrongPassword(password) {
  const normalizedPassword = String(password ?? '');

  return (
    normalizedPassword.length >= USER_PASSWORD_MIN_LENGTH &&
    isPasswordWithinBcryptLimit(normalizedPassword) &&
    /[A-Za-z]/.test(normalizedPassword) &&
    /\d/.test(normalizedPassword)
  );
}
