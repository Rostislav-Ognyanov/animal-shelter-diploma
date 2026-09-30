import { useEffect, useState } from 'react';

export function useDebouncedSearchFilter(searchValue, onSearchChange, delayMs = 350) {
  const normalizedSearchValue = searchValue ?? '';
  const [draftSearch, setDraftSearch] = useState(normalizedSearchValue);

  useEffect(() => {
    setDraftSearch(normalizedSearchValue);
  }, [normalizedSearchValue]);

  useEffect(() => {
    if (draftSearch === normalizedSearchValue) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onSearchChange(draftSearch);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, draftSearch, normalizedSearchValue, onSearchChange]);

  return [draftSearch, setDraftSearch];
}
