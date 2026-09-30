import { Fragment } from 'react';
import { Link } from 'react-router-dom';

import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { PageContentLink } from '../page-content/PageContentLink.jsx';
import {
  buildHeroBackgroundStyle,
  getVisibleContentItems,
  splitContentText,
  truncateContentText,
  usePageContent,
} from '../page-content/pageContentUtils.js';
import { usePublishedRescueStories } from './useRescueStories.js';
import { usePublishedSpeciesContentList } from './useSpeciesContent.js';

function OverviewInfoBlock({ block }) {
  const paragraphs = splitContentText(block.text);
  const imageElement = block.imagePath ? (
    <figure className="about-page-split-image">
      <img src={buildPublicAssetPath(block.imagePath)} alt={block.imageAlt ?? ''} />
    </figure>
  ) : null;
  const copyElement = (
    <article className="about-page-split-copy animals-overview-story-copy">
      <h2>{block.title}</h2>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <PageContentLink className="page-contact-link animals-overview-story-action" to={block.ctaTo}>
        {block.ctaLabel}
      </PageContentLink>
    </article>
  );

  return (
    <div
      className={`about-page-split-inner about-page-story-row animals-overview-story-row ${
        block.imagePosition === 'left' ? 'about-page-story-row-reversed' : ''
      }`}
    >
      {block.imagePosition === 'left' ? imageElement : copyElement}
      {block.imagePosition === 'left' ? copyElement : imageElement}
    </div>
  );
}

export function AnimalsOverviewPage() {
  const { content, error, isLoading, reload } = usePageContent('animals-overview');
  const {
    speciesContent,
    errorMessage: speciesErrorMessage,
    isLoading: isSpeciesLoading,
  } = usePublishedSpeciesContentList();
  const speciesCount = Number.isFinite(Number(content.speciesSection?.count))
    ? Number(content.speciesSection.count)
    : 4;
  const storiesCount = Number.isFinite(Number(content.storiesSection?.count))
    ? Number(content.storiesSection.count)
    : 3;
  const {
    stories,
    errorMessage: storiesErrorMessage,
    isLoading: isStoriesLoading,
  } = usePublishedRescueStories({
    random: true,
    limit: storiesCount,
  });
  const infoBlocks = getVisibleContentItems(content.infoBlocks ?? []);
  const featuredSpecies = speciesContent.slice(0, speciesCount);

  if (isLoading) {
    return <PageLoadingState className="animals-overview-shell animals-page-shell" />;
  }

  if (error) {
    return (
      <PageErrorState
        className="animals-overview-shell animals-page-shell"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <main className="route-shell animals-overview-shell animals-page-shell">
      <section
        className="animals-overview-page-hero"
        style={buildHeroBackgroundStyle(content.hero?.imagePath)}
      >
        <div>
          <h1>{content.hero?.title}</h1>
        </div>
      </section>

      {infoBlocks.length > 0 ? (
        <section className="about-page-story-block">
          {infoBlocks.map((block, index) => (
            <Fragment key={block.id ?? block.title}>
              {index > 0 ? <div className="about-page-story-divider" aria-hidden="true" /> : null}
              <OverviewInfoBlock block={block} />
            </Fragment>
          ))}
        </section>
      ) : null}

      <section className="animals-overview-species-section" id="species-showcase-section">
        <div className="animals-overview-section-heading">
          <div className="animals-overview-heading-copy">
            <h2>{content.speciesSection?.title}</h2>
            <p>{content.speciesSection?.description}</p>
          </div>
          <PageContentLink className="app-secondary-action" to={content.speciesSection?.ctaTo}>
            {content.speciesSection?.ctaLabel}
          </PageContentLink>
        </div>

        <div className="animals-overview-species-grid">
          {featuredSpecies.map((species) => (
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
        ) : speciesErrorMessage ? (
          <p className="content-state-message" role="alert">
            {speciesErrorMessage}
          </p>
        ) : featuredSpecies.length === 0 ? (
          <p className="content-state-message" role="status">
            В момента няма публикувана информация за видове животни.
          </p>
        ) : null}
      </section>

      <section className="animals-overview-stories-section" id="rescue-stories-section">
        <div className="animals-overview-section-heading">
          <div className="animals-overview-heading-copy">
            <h2>{content.storiesSection?.title}</h2>
            <p>{content.storiesSection?.description}</p>
          </div>
        </div>

        <div className="rescue-stories-preview-grid">
          {stories.map((story) => (
            <article
              key={story.id ?? story.slug ?? story.title}
              className="rescue-story-preview-card"
            >
              <h3>{story.title}</h3>
              <p>{truncateContentText(story.summary || story.content, 150)}</p>
            </article>
          ))}
        </div>

        {isStoriesLoading ? (
          <p className="content-state-message" role="status">
            Зареждане...
          </p>
        ) : storiesErrorMessage ? (
          <p className="content-state-message" role="alert">
            {storiesErrorMessage}
          </p>
        ) : stories.length === 0 ? (
          <p className="content-state-message" role="status">
            Няма публикувани истории.
          </p>
        ) : null}

        <PageContentLink
          className="page-contact-link rescue-stories-preview-more-link"
          to={content.storiesSection?.ctaTo}
        >
          {content.storiesSection?.ctaLabel}
        </PageContentLink>
      </section>
    </main>
  );
}
