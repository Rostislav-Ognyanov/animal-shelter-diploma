export const USER_FIRST_NAME_MAX_LENGTH = 80;
export const USER_LAST_NAME_MAX_LENGTH = 80;
export const USER_EMAIL_MAX_LENGTH = 254;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const USERNAME_HTML_PATTERN = '[A-Za-z0-9._-]+';
export const USERNAME_PATTERN = new RegExp(
  `^[A-Za-z0-9._-]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`
);

export const USER_PASSWORD_MIN_LENGTH = 8;
export const USER_PASSWORD_MAX_BYTES = 72;
// HTML maxLength counts characters, while bcrypt enforces a UTF-8 byte limit.
// The server-side byte validation remains authoritative.
export const USER_PASSWORD_MAX_LENGTH = USER_PASSWORD_MAX_BYTES;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const USER_STATUS_VALUES = Object.freeze(['active', 'inactive']);
