import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { DEFAULT_PAGE_CONTENT } from '../page-content/pageContentDefaults.js';
import { buildHeroBackgroundStyle, usePageContent } from '../page-content/pageContentUtils.js';
import { usePublishedSpeciesContentList } from './useSpeciesContent.js';

export function AnimalsInfoPage() {
  const { content } = usePageContent('animals-info', DEFAULT_PAGE_CONTENT['animals-info']);
  const { speciesContent } = usePublishedSpeciesContentList();

  return (
    <main className="route-shell animals-overview-shell animals-page-shell animals-info-page-shell">
      <section className="animals-info-page-hero" style={buildHeroBackgroundStyle(content.hero?.imagePath)}>
        <div>
          <h1>{content.hero?.title}</h1>
        </div>
      </section>

      <section className="animals-overview-species-section" id="species-showcase-section">
        <div className="animals-overview-species-intro">
          <h1>{content.intro?.title}</h1>
          <p>{content.intro?.description}</p>
          {content.intro?.note ? <strong>{content.intro.note}</strong> : null}
        </div>

        <div className="animals-overview-species-grid">
          {speciesContent.map((species) => (
            <Link
              key={species.species}
              className="animals-overview-species-card"
              to={`/za-zhivotnite/${species.species}`}
            >
              <img src={buildPublicAssetPath(species.cardImageUrl)} alt={species.cardImageAlt} />
              <span>{species.displayName}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
