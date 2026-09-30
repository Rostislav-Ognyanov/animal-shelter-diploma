import { useEffect, useState } from 'react';

import { fetchJson } from '../../lib/api.js';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function clonePageContent(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export function mergePageContent(defaultContent, savedContent) {
  if (!isPlainObject(savedContent)) {
    return clonePageContent(defaultContent);
  }

  const mergedContent = clonePageContent(defaultContent);

  Object.entries(savedContent).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      mergedContent[key] = value;
      return;
    }

    if (isPlainObject(value) && isPlainObject(mergedContent[key])) {
      mergedContent[key] = {
        ...mergedContent[key],
        ...value,
      };
      return;
    }

    mergedContent[key] = value;
  });

  return mergedContent;
}

export function usePageContent(pageKey) {
  const [content, setContent] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // reloadToken provides an explicit retry path after a temporary content API failure.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError('');
    setContent({});

    fetchJson(`/api/page-content/${pageKey}`)
      .then((pageContent) => {
        // Ignore stale responses that may arrive after the user navigates to another page.
        if (!isMounted) {
          return;
        }

        setContent(isPlainObject(pageContent?.content) ? pageContent.content : {});
      })
      .catch((requestError) => {
        if (!isMounted) {
          return;
        }

        setError(requestError.message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pageKey, reloadToken]);

  return {
    content,
    error,
    isLoading,
    reload: () => setReloadToken((currentValue) => currentValue + 1),
    setContent,
  };
}

export function getVisibleContentItems(items = []) {
  return Array.isArray(items) ? items.filter((item) => item?.isVisible !== false) : [];
}

export function buildHeroBackgroundStyle(imagePath) {
  const overlay = 'linear-gradient(90deg, rgba(28, 67, 47, 0.86), rgba(47, 111, 78, 0.34))';

  if (!imagePath) {
    return {
      backgroundImage: overlay,
    };
  }

  return {
    backgroundImage: `${overlay}, url("${buildPublicAssetPath(imagePath)}")`,
  };
}

export function splitContentText(text) {
  return String(text ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function truncateContentText(text, maxLength = 260) {
  const normalizedText = String(text ?? '').trim();

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, maxLength).trim()}...`;
}
