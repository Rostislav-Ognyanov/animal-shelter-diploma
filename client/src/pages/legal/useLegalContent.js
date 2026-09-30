import { useEffect, useState } from 'react';

import { fetchJson } from '../../lib/api.js';

export function useLegalContent(legalKey) {
  const [legalContent, setLegalContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    setLegalContent(null);
    setIsLoading(true);
    setErrorMessage('');

    fetchJson(`/api/legal-content/${legalKey}`)
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        if (!payload?.content || typeof payload.content !== 'object') {
          throw new Error('Публикуваното юридическо съдържание не може да бъде заредено.');
        }

        setLegalContent(payload.content);
      })
      .catch((error) => {
        if (isMounted) {
          setLegalContent(null);
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
  }, [legalKey, reloadToken]);

  return {
    legalContent,
    isLoading,
    errorMessage,
    reload: () => setReloadToken((currentValue) => currentValue + 1),
  };
}
