import { useEffect, useState } from 'react';

import { buildEmptyPagination } from '../components/common/PaginationControls.jsx';
import { fetchApiResponse } from '../lib/api.js';

const selectDefaultItems = (payload) => payload.data?.items ?? [];
const selectDefaultTotal = (payload) => payload.data?.total ?? 0;
const selectDefaultAdditionalState = () => ({});

export function usePaginatedManagementList({
  buildQuery,
  defaultLimit,
  filters,
  onPageSync,
  selectItems = selectDefaultItems,
  selectTotal = selectDefaultTotal,
  selectAdditionalState = selectDefaultAdditionalState,
}) {
  // reloadToken lets a page refresh the current collection without changing URL filters.
  const [reloadToken, setReloadToken] = useState(0);
  const [pageState, setPageState] = useState({
    items: [],
    total: 0,
    pagination: buildEmptyPagination(defaultLimit),
    isLoading: true,
    error: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        setPageState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));

        const payload = await fetchApiResponse(buildQuery(filters));

        // Ignore slower stale requests after the user has already changed filters or page.
        if (!isMounted) {
          return;
        }

        const pagination = payload.meta?.pagination ?? buildEmptyPagination(defaultLimit);

        setPageState({
          items: selectItems(payload),
          total: selectTotal(payload),
          pagination,
          ...selectAdditionalState(payload),
          isLoading: false,
          error: '',
        });

        const syncedPage = Number(pagination.page ?? filters.page);

        if (Number.isInteger(syncedPage) && syncedPage > 0 && syncedPage !== filters.page) {
          onPageSync?.(syncedPage);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          items: [],
          total: 0,
          pagination: buildEmptyPagination(defaultLimit),
          ...selectAdditionalState(null),
          isLoading: false,
          error: error.message,
        });
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [
    buildQuery,
    defaultLimit,
    filters,
    onPageSync,
    reloadToken,
    selectAdditionalState,
    selectItems,
    selectTotal,
  ]);

  return {
    pageState,
    reload: () => setReloadToken((currentValue) => currentValue + 1),
    setPageState,
  };
}
