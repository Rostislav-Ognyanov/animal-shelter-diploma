import { Fragment } from 'react';
import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { PageContentLink } from '../page-content/PageContentLink.jsx';
import { DEFAULT_PAGE_CONTENT } from '../page-content/pageContentDefaults.js';
import {
  buildHeroBackgroundStyle,
  getVisibleContentItems,
  splitContentText,
  usePageContent,
} from '../page-content/pageContentUtils.js';
import { DEFAULT_RESCUE_STORIES } from './rescueStoriesData.js';
import { usePublishedRescueStories } from './useRescueStories.js';
import { usePublishedSpeciesContentList } from './useSpeciesContent.js';

const DEFAULT_OVERVIEW_STORIES = DEFAULT_RESCUE_STORIES.filter((story) => story.isFeatured).slice(0, 3);

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
      <PageContentLink className="about-page-contact-link animals-overview-story-action" to={block.ctaTo}>
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
  const { content } = usePageContent('animals-overview', DEFAULT_PAGE_CONTENT['animals-overview']);
  const { speciesContent } = usePublishedSpeciesContentList();
  const { stories } = usePublishedRescueStories({ featured: true, limit: 3 }, DEFAULT_OVERVIEW_STORIES);
  const infoBlocks = getVisibleContentItems(content.infoBlocks ?? []);
  const featuredSpecies = speciesContent.slice(0, 4);

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
        <section className="about-page-story-block animals-overview-story-block">
          {infoBlocks.map((block, index) => (
            <Fragment key={block.id ?? block.title}>
              {index > 0 ? <div className="about-page-story-divider" aria-hidden="true" /> : null}
              <OverviewInfoBlock block={block} />
            </Fragment>
          ))}
        </section>
      ) : null}

      <section className="animals-overview-species-section" id="species-showcase-section">
        <div className="animals-overview-section-heading animals-overview-stories-heading">
          <div className="animals-overview-heading-copy">
            <h2>{content.speciesSection?.title}</h2>
            <p>{content.speciesSection?.description}</p>
          </div>
          <PageContentLink className="animals-secondary-action" to={content.speciesSection?.ctaTo}>
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
      </section>

      <section className="animals-overview-stories-section" id="rescue-stories-section">
        <div className="animals-overview-section-heading animals-overview-stories-heading">
          <div className="animals-overview-heading-copy">
            <h2>{content.storiesSection?.title}</h2>
            <p>{content.storiesSection?.description}</p>
          </div>
          <PageContentLink className="animals-secondary-action" to={content.storiesSection?.ctaTo}>
            {content.storiesSection?.ctaLabel}
          </PageContentLink>
        </div>

        <div className="animals-overview-stories-grid">
          {stories.map((story) => (
            <article key={story.id ?? story.slug ?? story.title} className="animals-overview-story-card">
              <small>от {story.submittedBy}</small>
              <h3>{story.title}</h3>
              <p>{story.summary || story.content}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
