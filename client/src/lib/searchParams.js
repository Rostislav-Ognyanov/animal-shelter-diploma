export function normalizePageParam(value) {
  const numericPage = Number(value ?? 1);
  return Number.isInteger(numericPage) && numericPage > 0 ? numericPage : 1;
}

export function readManagementListSearchParams(searchParams, { includeStatus = true, extraKeys = [] } = {}) {
  const extraFilters = Object.fromEntries(
    extraKeys.map((key) => [key, searchParams.get(key) || ''])
  );

  return {
    ...(includeStatus ? { status: searchParams.get('status') || '' } : {}),
    ...extraFilters,
    search: searchParams.get('search') || '',
    page: normalizePageParam(searchParams.get('page')),
  };
}

export function buildManagementListSearchParams(
  currentFilters,
  nextValues,
  { includeStatus = true, extraKeys = [] } = {}
) {
  const nextParams = new URLSearchParams();
  const nextSearch = nextValues.search ?? currentFilters.search ?? '';
  const nextPage = Object.prototype.hasOwnProperty.call(nextValues, 'page')
    ? normalizePageParam(nextValues.page)
    : 1;

  if (includeStatus) {
    const nextStatus = nextValues.status ?? currentFilters.status ?? '';

    if (nextStatus) {
      nextParams.set('status', nextStatus);
    }
  }

  extraKeys.forEach((key) => {
    const nextValue = String(nextValues[key] ?? currentFilters[key] ?? '').trim();

    if (nextValue) {
      nextParams.set(key, nextValue);
    }
  });

  if (nextSearch.trim()) {
    nextParams.set('search', nextSearch.trim());
  }

  if (nextPage > 1) {
    nextParams.set('page', String(nextPage));
  }

  return nextParams;
}
