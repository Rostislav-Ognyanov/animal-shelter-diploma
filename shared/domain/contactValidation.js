export const PHONE_ALLOWED_PATTERN = /^[0-9+\s().-]{6,32}$/;

export const PHONE_DIGIT_LIMITS = Object.freeze({
  min: 7,
  max: 15,
});

export function isValidPhone(
  value,
  {
    minDigits = PHONE_DIGIT_LIMITS.min,
    maxDigits = PHONE_DIGIT_LIMITS.max,
    allowEmpty = false,
  } = {}
) {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return allowEmpty;
  }

  if (!PHONE_ALLOWED_PATTERN.test(normalizedValue)) {
    return false;
  }

  const digitCount = (normalizedValue.match(/\d/g) ?? []).length;
  return digitCount >= minDigits && digitCount <= maxDigits;
}
