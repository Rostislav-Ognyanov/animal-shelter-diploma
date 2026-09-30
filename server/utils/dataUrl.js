const BASE64_DATA_URL_PATTERN = /^data:([^;,]+);base64,([a-z0-9+/]+={0,2})$/i;

function getBase64ByteLength(base64Value) {
  if (!base64Value || base64Value.length % 4 !== 0) {
    return -1;
  }

  const paddingLength = base64Value.endsWith('==')
    ? 2
    : base64Value.endsWith('=')
      ? 1
      : 0;

  return (base64Value.length * 3) / 4 - paddingLength;
}

export function parseBase64DataUrl(value) {
  const match = String(value ?? '').match(BASE64_DATA_URL_PATTERN);

  if (!match) {
    return null;
  }

  const byteLength = getBase64ByteLength(match[2]);

  if (byteLength < 0) {
    return null;
  }

  return {
    mimeType: match[1].toLowerCase(),
    base64Value: match[2],
    byteLength,
  };
}
