export function getAuthRedirectPath(redirectTarget, fallbackPath = '/') {
  if (!redirectTarget || typeof redirectTarget !== 'object') {
    return fallbackPath;
  }

  const pathname = String(redirectTarget.pathname ?? '');

  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return fallbackPath;
  }

  const search = String(redirectTarget.search ?? '');
  const hash = String(redirectTarget.hash ?? '');
  const safeSearch = !search || search.startsWith('?') ? search : '';
  const safeHash = !hash || hash.startsWith('#') ? hash : '';

  return `${pathname}${safeSearch}${safeHash}`;
}
