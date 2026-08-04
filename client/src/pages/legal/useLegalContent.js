import { useEffect, useState } from 'react';

import { fetchJson } from '../../lib/api.js';
import { getDefaultLegalContent, normalizeLegalContent } from './legalContentDefaults.js';

export function useLegalContent(legalKey) {
  const fallbackContent = getDefaultLegalContent(legalKey);
  const [legalContent, setLegalContent] = useState(fallbackContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setLegalContent(fallbackContent);
    setIsLoading(true);

    fetchJson(`/api/legal-content/${legalKey}`)
      .then((payload) => {
        if (isMounted) {
          setLegalContent(normalizeLegalContent(payload?.content, fallbackContent));
        }
      })
      .catch(() => {
        if (isMounted) {
          setLegalContent(fallbackContent);
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
  }, [fallbackContent, legalKey]);

  return { legalContent, isLoading };
}
