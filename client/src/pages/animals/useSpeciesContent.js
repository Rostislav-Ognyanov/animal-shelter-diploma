import { useEffect, useState } from 'react';

import { fetchJson } from '../../lib/api.js';

export function usePublishedSpeciesContentList() {
  const [speciesContent, setSpeciesContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage('');

    fetchJson('/api/species-content')
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(payload?.items) ? payload.items : [];

        setSpeciesContent(items);
      })
      .catch((error) => {
        if (isMounted) {
          setSpeciesContent([]);
          setErrorMessage(error.message);
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
  }, []);

  return { speciesContent, isLoading, errorMessage };
}

export function usePublishedSpeciesContent(species) {
  const [speciesContent, setSpeciesContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    setSpeciesContent(null);
    setIsLoading(true);
    setErrorMessage('');

    if (!species) {
      setIsLoading(false);
      return undefined;
    }

    fetchJson(`/api/species-content/${species}`)
      .then((payload) => {
        if (isMounted) {
          setSpeciesContent(payload);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSpeciesContent(null);
          setErrorMessage(error.message);
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
  }, [species]);

  return { speciesContent, isLoading, errorMessage };
}
