import { Link } from 'react-router-dom';

import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { buildHeroBackgroundStyle, usePageContent } from '../page-content/pageContentUtils.js';
import { usePublishedSpeciesContentList } from './useSpeciesContent.js';

export function AnimalsInfoPage() {
  const { content, error, isLoading, reload } = usePageContent('animals-info');
  const {
    speciesContent,
    errorMessage,
    isLoading: isSpeciesLoading,
  } = usePublishedSpeciesContentList();

  if (isLoading) {
    return <PageLoadingState className="animals-overview-shell animals-page-shell animals-info-page-shell" />;
  }

  if (error) {
    return (
      <PageErrorState
        className="animals-overview-shell animals-page-shell animals-info-page-shell"
        message={error}
        onRetry={reload}
      />
    );
  }

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

        {isSpeciesLoading ? (
          <p className="content-state-message" role="status">
            Зареждане...
          </p>
        ) : errorMessage ? (
          <p className="content-state-message" role="alert">
            {errorMessage}
          </p>
        ) : speciesContent.length === 0 ? (
          <p className="content-state-message" role="status">
            В момента няма публикувана информация за видове животни.
          </p>
        ) : null}
      </section>
    </main>
  );
}
