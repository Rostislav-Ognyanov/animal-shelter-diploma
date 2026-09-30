import { useEffect, useState } from 'react';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';

const GENERIC_ANIMAL_FALLBACK = 'images/animals/placeholders/animal.svg';

const ANIMAL_FALLBACK_IMAGES = {
  dog: 'images/animals/placeholders/dog.svg',
  cat: 'images/animals/placeholders/cat.svg',
  rabbit: 'images/animals/placeholders/rabbit.svg',
  fox: 'images/animals/placeholders/fox.svg',
  lizard: 'images/animals/placeholders/lizard.svg',
  owl: 'images/animals/placeholders/owl.svg',
  horse: 'images/animals/placeholders/horse.svg',
  hedgehog: 'images/animals/placeholders/hedgehog.svg',
};

export function getAnimalFallbackImage(species) {
  const normalizedSpecies = String(species ?? '').trim().toLowerCase();

  return ANIMAL_FALLBACK_IMAGES[normalizedSpecies] ?? GENERIC_ANIMAL_FALLBACK;
}

export function AnimalImage({
  src,
  species,
  alt,
  className,
  fallbackSrc,
  loading = 'lazy',
}) {
  const [hasError, setHasError] = useState(false);
  const resolvedFallbackSrc = fallbackSrc || getAnimalFallbackImage(species);
  const resolvedSrc = !hasError && src ? src : resolvedFallbackSrc;
  const publicSrc = buildPublicAssetPath(resolvedSrc);

  useEffect(() => {
    setHasError(false);
  }, [src, species, fallbackSrc]);

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
