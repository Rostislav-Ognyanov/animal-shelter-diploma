import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { SPECIES_SHOWCASE_ITEMS } from './animalAwarenessData.js';
import { buildAnimalsSearchPath } from './animalsListQuery.js';
import { SPECIES_DETAILED_CONTENT } from './speciesDetailedContent.js';
import { SPECIES_FACTS } from './speciesFactsData.js';

function SpeciesDetailSection({ index, section }) {
  const copyRef = useRef(null);
  const [imageHeight, setImageHeight] = useState(null);

  useEffect(() => {
    if (!section.imageSrc || !copyRef.current) {
      return undefined;
    }

    function updateImageHeight() {
      if (window.matchMedia('(max-width: 900px)').matches) {
        setImageHeight(null);
        return;
      }

      const copyHeight = copyRef.current.getBoundingClientRect().height;
      setImageHeight(Math.min(430, Math.round(copyHeight * 1.5)));
    }

    updateImageHeight();

    const resizeObserver = new ResizeObserver(updateImageHeight);
    resizeObserver.observe(copyRef.current);
    window.addEventListener('resize', updateImageHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateImageHeight);
    };
  }, [section.imageSrc]);

  return (
    <article
      className={`species-info-detail-row${index % 2 === 1 ? ' is-reversed' : ''}${
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

      {section.imageSrc ? (
        <figure
          className="species-info-detail-image"
          style={imageHeight ? { height: `${imageHeight}px` } : undefined}
        >
          <img src={buildPublicAssetPath(section.imageSrc)} alt={section.imageAlt} />
        </figure>
      ) : null}
    </article>
  );
}

export function SpeciesInfoPage() {
  const { species } = useParams();
  const facts = SPECIES_FACTS[species];
  const detailedContent = SPECIES_DETAILED_CONTENT[species];
  const speciesItem = SPECIES_SHOWCASE_ITEMS.find((item) => item.value === species);

  if (!facts || !speciesItem) {
    return (
      <main className="route-shell species-info-shell">
        <section className="species-info-not-found">
          <h1>Информацията не беше намерена</h1>
          <p>Избери вид от страницата с животните.</p>
          <Link className="animals-primary-action" to="/za-zhivotnite">
            Към животните
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={`route-shell species-info-shell${detailedContent ? ' species-info-detailed-shell' : ''}`}>
      {detailedContent ? (
        <section
          className="species-info-page-hero"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(28, 67, 47, 0.86), rgba(47, 111, 78, 0.34)), url("${buildPublicAssetPath(
              detailedContent.heroImageSrc
            )}")`,
          }}
        >
          <div>
            <h1>{facts.title}</h1>
          </div>
        </section>
      ) : (
        <section className="species-info-hero">
          <div className="species-info-hero-copy">
            <Link className="animals-secondary-action" to="/za-zhivotnite">
              Назад към видовете
            </Link>
            <h1>{facts.title}</h1>
            <p>{facts.subtitle}</p>
            <Link className="animals-primary-action" to={buildAnimalsSearchPath({ species })}>
              Виж животните за осиновяване
            </Link>
          </div>

          <div className="species-info-hero-image">
            <img src={buildPublicAssetPath(speciesItem.imageSrc)} alt={speciesItem.imageAlt} />
          </div>
        </section>
      )}

      {detailedContent ? (
        <section className="species-info-detail-sections">
          {detailedContent.sections.map((section, index) => (
            <SpeciesDetailSection key={section.title} index={index} section={section} />
          ))}
        </section>
      ) : (
        <section className="species-info-chapters">
          {facts.chapters.map((chapter) => (
            <article key={chapter.title} className="species-info-chapter">
              <h2>{chapter.title}</h2>
              {chapter.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
