const APP_BASE_URL = import.meta.env.BASE_URL ?? '/';

export function buildPublicAssetPath(assetPath = '') {
  const normalizedPath = String(assetPath ?? '').trim();

  if (!normalizedPath) {
    return '';
  }

  if (/^(?:data:|https?:|blob:)/i.test(normalizedPath)) {
    return normalizedPath;
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  const basePath = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;

  return `${basePath}${relativePath}`;
}
