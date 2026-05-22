import { useState } from 'react';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';

const DEFAULT_ANIMAL_IMAGE = 'images/animals/dog.png';

export function AnimalImage({
  src,
  alt,
  className,
  fallbackSrc = DEFAULT_ANIMAL_IMAGE,
  loading = 'lazy',
}) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = !hasError && src ? src : fallbackSrc;
  const publicSrc = buildPublicAssetPath(resolvedSrc);

  return (
    <img
      className={className}
      src={publicSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}
