import { useState } from 'react';

const DEFAULT_ANIMAL_IMAGE = '/images/animals/dog.png';

export function AnimalImage({
  src,
  alt,
  className,
  fallbackSrc = DEFAULT_ANIMAL_IMAGE,
  loading = 'lazy',
}) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = !hasError && src ? src : fallbackSrc;

  return (
    <img
      className={className}
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}