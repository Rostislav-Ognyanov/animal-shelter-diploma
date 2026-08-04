import { Fragment, useMemo, useState } from 'react';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { PageContentLink } from '../page-content/PageContentLink.jsx';
import { DEFAULT_PAGE_CONTENT } from '../page-content/pageContentDefaults.js';
import {
  buildHeroBackgroundStyle,
  splitContentText,
  usePageContent,
} from '../page-content/pageContentUtils.js';
import {
  RESCUE_STORY_STATUS_CLASSES,
  RESCUE_STORY_STATUS_LABELS,
} from './rescueStoriesData.js';
import { usePublishedRescueStories } from './useRescueStories.js';

const STORY_STATUS_VALUES = Object.keys(RESCUE_STORY_STATUS_LABELS);

export function RescueStoriesPage() {
  const { content } = usePageContent('rescue-stories', DEFAULT_PAGE_CONTENT['rescue-stories']);
  const { stories } = usePublishedRescueStories();
  const [animalFilter, setAnimalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const animalTypes = useMemo(
    () => [...new Set(stories.map((story) => story.animalType).filter(Boolean))],
    [stories]
  );

  const filteredStories = useMemo(
    () =>
      stories.filter(
        (story) =>
          (!animalFilter || story.animalType === animalFilter) &&
          (!statusFilter || story.outcomeStatus === statusFilter)
      ),
    [animalFilter, statusFilter, stories]
  );

  const introParagraphs = splitContentText(content.introBlock?.text);
  const hasActiveFilters = Boolean(animalFilter || statusFilter);

  const handleClearFilters = () => {
    setAnimalFilter('');
    setStatusFilter('');
  };

  return (
    <main className="route-shell rescue-stories-page-shell">
      <section
        className="rescue-stories-page-hero"
        style={buildHeroBackgroundStyle(content.hero?.imagePath)}
      >
        <div>
          <h1>{content.hero?.title}</h1>
        </div>
      </section>

      <section className="about-page-story-block rescue-stories-page-intro">
        <div
          className={`about-page-split-inner about-page-story-row ${
            content.introBlock?.imagePosition === 'left' ? 'about-page-story-row-reversed' : ''
          }`}
        >
          <article className="about-page-split-copy">
            <h2>{content.introBlock?.title}</h2>
            {introParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>

          {content.introBlock?.imagePath ? (
            <figure className="about-page-split-image">
              <img
                src={buildPublicAssetPath(content.introBlock.imagePath)}
                alt={content.introBlock.imageAlt ?? ''}
              />
            </figure>
          ) : null}
        </div>
      </section>

      <section className="rescue-stories-page-grid">
        <h2 className="rescue-stories-page-list-title">{content.listSection?.title}</h2>

        <div className="rescue-stories-page-filters" aria-label="Филтриране на историите">
          <label>
            Животно
            <select value={animalFilter} onChange={(event) => setAnimalFilter(event.target.value)}>
              <option value="">Всички</option>
              {animalTypes.map((animalType) => (
                <option key={animalType} value={animalType}>
                  {animalType}
                </option>
              ))}
            </select>
          </label>

          <label>
            Статус
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Всички</option>
              {STORY_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {RESCUE_STORY_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          {hasActiveFilters ? (
            <button type="button" className="animals-secondary-action" onClick={handleClearFilters}>
              Изчисти
            </button>
          ) : null}
        </div>

        {filteredStories.map((story) => (
          <article key={story.id ?? story.slug ?? story.title} className="rescue-stories-page-card">
            <div className="rescue-stories-page-card-copy">
              <div className="rescue-stories-page-meta">
                <small>от {story.submittedBy}</small>
                <span className="rescue-story-animal">Животно: {story.animalType}</span>
                <span className={`rescue-story-status ${RESCUE_STORY_STATUS_CLASSES[story.outcomeStatus] ?? ''}`}>
                  Статус: {RESCUE_STORY_STATUS_LABELS[story.outcomeStatus] ?? story.outcomeStatus}
                </span>
              </div>
              <h2>{story.title}</h2>
              {(story.content ?? '').split(/\n{2,}/).map((paragraph) => (
                <Fragment key={paragraph}>
                  <p>{paragraph}</p>
                </Fragment>
              ))}
            </div>

            {story.imageUrl ? (
              <figure className="rescue-stories-page-image">
                <img src={buildPublicAssetPath(story.imageUrl)} alt={story.imageAlt} />
              </figure>
            ) : null}
          </article>
        ))}

        {filteredStories.length === 0 ? (
          <p className="rescue-stories-page-empty" role="status">
            {content.listSection?.emptyState}
          </p>
        ) : null}

        <div className="rescue-stories-page-cta">
          <h2>{content.listSection?.ctaTitle}</h2>
          <PageContentLink className="about-page-contact-link" to={content.listSection?.ctaTo}>
            {content.listSection?.ctaLabel}
          </PageContentLink>
        </div>
      </section>
    </main>
  );
}
