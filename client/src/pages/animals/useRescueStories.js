import { useEffect, useState } from 'react';

import { RESCUE_STORY_PUBLIC_PAGE_SIZE } from '../../../../shared/domain/rescueStoryConstants.js';
import { buildEmptyPagination } from '../../components/common/PaginationControls.jsx';
import { fetchApiResponse } from '../../lib/api.js';
import { normalizeRescueStoryCollection } from './rescueStoriesPublicData.js';

function buildRescueStoriesQuery(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `/api/rescue-stories?${queryString}` : '/api/rescue-stories';
}

export function usePublishedRescueStories(filters = {}) {
  const [stories, setStories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState(() =>
    buildEmptyPagination(RESCUE_STORY_PUBLIC_PAGE_SIZE)
  );
  const [loadedQuery, setLoadedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const query = buildRescueStoriesQuery(filters);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage('');

    fetchApiResponse(query)
      .then((payload) => {
        if (isMounted) {
          const nextTotal = Number(payload.data?.total ?? 0);

          setStories(normalizeRescueStoryCollection(payload.data?.items));
          setTotal(nextTotal);
          setPagination(
            payload.meta?.pagination ??
              buildEmptyPagination(RESCUE_STORY_PUBLIC_PAGE_SIZE, nextTotal)
          );
        }
      })
      .catch((error) => {
        if (isMounted) {
          setStories([]);
          setTotal(0);
          setPagination(buildEmptyPagination(RESCUE_STORY_PUBLIC_PAGE_SIZE));
          setErrorMessage(error.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadedQuery(query);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [query]);

  return {
    stories,
    total,
    pagination,
    isLoading: isLoading || loadedQuery !== query,
    errorMessage,
  };
}
