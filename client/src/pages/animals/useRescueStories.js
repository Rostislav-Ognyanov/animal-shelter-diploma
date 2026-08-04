import { useEffect, useState } from 'react';

import { fetchJson } from '../../lib/api.js';
import { DEFAULT_RESCUE_STORIES, normalizeRescueStoryCollection } from './rescueStoriesData.js';

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

export function usePublishedRescueStories(filters = {}, fallbackItems = DEFAULT_RESCUE_STORIES) {
  const [stories, setStories] = useState(fallbackItems);
  const [isLoading, setIsLoading] = useState(true);
  const query = buildRescueStoriesQuery(filters);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);

    fetchJson(query)
      .then((payload) => {
        if (isMounted) {
          setStories(normalizeRescueStoryCollection(payload?.items, fallbackItems));
        }
      })
      .catch(() => {
        if (isMounted) {
          setStories(fallbackItems);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fallbackItems, query]);

  return { stories, isLoading };
}
