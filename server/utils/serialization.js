export function normalizeDateOutput(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

export function serializeId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value._id ?? value.id ?? '');
  }

  return String(value);
}
