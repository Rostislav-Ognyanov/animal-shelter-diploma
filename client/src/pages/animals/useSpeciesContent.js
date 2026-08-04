import { useEffect, useState } from 'react';

import { fetchJson } from '../../lib/api.js';
import {
  DEFAULT_SPECIES_CONTENT,
  getDefaultSpeciesContent,
  mergeSpeciesContentWithDefault,
} from './speciesContentData.js';

export function usePublishedSpeciesContentList(limitToDefaults = true) {
  const [speciesContent, setSpeciesContent] = useState(DEFAULT_SPECIES_CONTENT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);

    fetchJson('/api/species-content')
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(payload?.items) ? payload.items : [];

        if (items.length === 0 && limitToDefaults) {
          setSpeciesContent(DEFAULT_SPECIES_CONTENT);
          return;
        }

        setSpeciesContent(
          items.map((item) => mergeSpeciesContentWithDefault(getDefaultSpeciesContent(item.species), item))
        );
      })
      .catch(() => {
        if (isMounted) {
          setSpeciesContent(DEFAULT_SPECIES_CONTENT);
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
  }, [limitToDefaults]);

  return { speciesContent, isLoading };
}

export function usePublishedSpeciesContent(species) {
  const fallbackContent = getDefaultSpeciesContent(species);
  const [speciesContent, setSpeciesContent] = useState(fallbackContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setSpeciesContent(fallbackContent);
    setIsLoading(true);

    if (!species) {
      setIsLoading(false);
      return undefined;
    }

    fetchJson(`/api/species-content/${species}`)
      .then((payload) => {
        if (isMounted) {
          setSpeciesContent(mergeSpeciesContentWithDefault(fallbackContent, payload));
        }
      })
      .catch(() => {
        if (isMounted) {
          setSpeciesContent(fallbackContent);
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
  }, [fallbackContent, species]);

  return { speciesContent, isLoading };
}
