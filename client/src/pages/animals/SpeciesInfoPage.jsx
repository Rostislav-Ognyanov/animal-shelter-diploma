import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { buildHeroBackgroundStyle } from '../page-content/pageContentUtils.js';
import { buildAnimalsSearchPath } from './animalsListQuery.js';
import { usePublishedSpeciesContent } from './useSpeciesContent.js';

function SpeciesDetailSection({ section }) {
  const copyRef = useRef(null);
  const [imageHeight, setImageHeight] = useState(null);

  useEffect(() => {
    if (!section.imageUrl || !copyRef.current) {
      return undefined;
    }

    function updateImageHeight() {
      if (window.matchMedia('(max-width: 900px)').matches) {
        setImageHeight(null);
        return;
      }

      const copyHeight = copyRef.current.getBoundingClientRect().height;
      setImageHeight(Math.min(430, Math.max(280, Math.round(copyHeight * 1.4))));
    }

    updateImageHeight();

    const resizeObserver = new ResizeObserver(updateImageHeight);
    resizeObserver.observe(copyRef.current);
    window.addEventListener('resize', updateImageHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateImageHeight);
    };
  }, [section.imageUrl]);

  return (
    <article
      className={`species-info-detail-row${section.imagePosition === 'left' ? ' is-reversed' : ''}${
        section.centered ? ' is-centered' : ''
      }`}
    >
      <div ref={copyRef} className="species-info-detail-copy">
        <h2>{section.title}</h2>

        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        {section.items?.length ? (
          <ul>
            {section.items.map((item) => {
              const separatorIndex = item.indexOf(':');

              if (!section.centered || separatorIndex === -1) {
                return <li key={item}>{item}</li>;
              }

              return (
                <li key={item}>
                  <strong>{item.slice(0, separatorIndex)}:</strong>
                  {item.slice(separatorIndex + 1)}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {section.imageUrl ? (
        <figure
          className="species-info-detail-image"
          style={imageHeight ? { height: `${imageHeight}px` } : undefined}
        >
          <img src={buildPublicAssetPath(section.imageUrl)} alt={section.imageAlt} />
        </figure>
      ) : null}
    </article>
  );
}

export function SpeciesInfoPage() {
  const { species } = useParams();
  const { speciesContent, isLoading, errorMessage } = usePublishedSpeciesContent(species);
  const visibleSections = (speciesContent?.sections ?? [])
    .filter((section) => section.isVisible !== false)
    .sort((firstSection, secondSection) => (firstSection.order ?? 0) - (secondSection.order ?? 0));

  if (isLoading) {
    return (
      <main className="route-shell species-info-shell">
        <section className="species-info-not-found">
          <h1>Зареждане</h1>
          <p>Информацията за вида се зарежда.</p>
        </section>
      </main>
    );
  }

  if (!speciesContent) {
    return (
      <main className="route-shell species-info-shell">
        <section className="species-info-not-found">
          <h1>Информацията не беше намерена</h1>
          <p>{errorMessage || 'Избери вид от страницата с животните.'}</p>
          <Link className="app-primary-action" to="/za-zhivotnite">
            Към животните
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="route-shell species-info-shell species-info-detailed-shell">
      <section className="species-info-page-hero" style={buildHeroBackgroundStyle(speciesContent.heroImageUrl)}>
        <div>
          <h1>{speciesContent.displayName}</h1>
        </div>
      </section>

      <section className="species-info-detail-sections">
        {visibleSections.map((section) => (
          <SpeciesDetailSection key={section.title} section={section} />
        ))}

        <div className="route-actions species-info-detail-actions">
          <Link className="app-secondary-action" to="/informacia-za-zhivotnite">
            Назад към видовете
          </Link>
          <Link
            className="app-primary-action"
            to={buildAnimalsSearchPath({ species }, { scrollToFilters: true })}
          >
            Виж животните
          </Link>
        </div>
      </section>
    </main>
  );
}
