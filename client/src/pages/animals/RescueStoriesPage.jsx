import { Fragment, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PaginationControls } from '../../components/common/PaginationControls.jsx';
import { PageErrorState, PageLoadingState } from '../../components/common/PageStatusStates.jsx';
import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { normalizePageParam } from '../../lib/searchParams.js';
import {
  ANIMAL_SPECIES_LABELS,
  ANIMAL_SPECIES_VALUES,
} from '../../../../shared/domain/animalConstants.js';
import {
  RESCUE_STORY_OUTCOME_STATUS_LABELS,
  RESCUE_STORY_OUTCOME_STATUS_VALUES,
  RESCUE_STORY_PUBLIC_PAGE_SIZE,
} from '../../../../shared/domain/rescueStoryConstants.js';
import { PageContentLink } from '../page-content/PageContentLink.jsx';
import {
  buildHeroBackgroundStyle,
  splitContentText,
  usePageContent,
} from '../page-content/pageContentUtils.js';
import { RESCUE_STORY_STATUS_CLASSES } from './rescueStoriesPublicData.js';
import { usePublishedRescueStories } from './useRescueStories.js';

export function RescueStoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { content, error, isLoading, reload } = usePageContent('rescue-stories');
  const animalTypeCandidate = searchParams.get('animalType') || '';
  const outcomeStatusCandidate = searchParams.get('outcomeStatus') || '';
  const page = normalizePageParam(searchParams.get('page'));
  const animalFilter = ANIMAL_SPECIES_VALUES.includes(animalTypeCandidate)
    ? animalTypeCandidate
    : '';
  const statusFilter = RESCUE_STORY_OUTCOME_STATUS_VALUES.includes(outcomeStatusCandidate)
    ? outcomeStatusCandidate
    : '';
  const {
    stories,
    pagination,
    errorMessage: storiesErrorMessage,
    isLoading: isStoriesLoading,
  } = usePublishedRescueStories({
    animalType: animalFilter,
    outcomeStatus: statusFilter,
    page,
    limit: RESCUE_STORY_PUBLIC_PAGE_SIZE,
  });
  const introParagraphs = splitContentText(content.introBlock?.text);
  const hasActiveFilters = Boolean(animalFilter || statusFilter);

  useEffect(() => {
    const responsePage = normalizePageParam(pagination.page);

    if (isStoriesLoading || responsePage === page) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);

    if (responsePage > 1) {
      nextParams.set('page', String(responsePage));
    } else {
      nextParams.delete('page');
    }

    setSearchParams(nextParams, { replace: true });
  }, [isStoriesLoading, page, pagination.page, searchParams, setSearchParams]);

  function updateStoryFilters(nextValues) {
    const nextParams = new URLSearchParams(searchParams);
    const nextAnimalType = nextValues.animalType ?? animalFilter;
    const nextOutcomeStatus = nextValues.outcomeStatus ?? statusFilter;

    nextParams.delete('animalType');
    nextParams.delete('outcomeStatus');
    nextParams.delete('page');

    if (nextAnimalType) {
      nextParams.set('animalType', nextAnimalType);
    }

    if (nextOutcomeStatus) {
      nextParams.set('outcomeStatus', nextOutcomeStatus);
    }

    setSearchParams(nextParams, { replace: true });
  }

  function handleClearFilters() {
    updateStoryFilters({
      animalType: '',
      outcomeStatus: '',
    });
  }

  function handlePageChange(nextPage) {
    const normalizedPage = normalizePageParam(nextPage);
    const nextParams = new URLSearchParams(searchParams);

    if (normalizedPage > 1) {
      nextParams.set('page', String(normalizedPage));
    } else {
      nextParams.delete('page');
    }

    setSearchParams(nextParams);
  }

  if (isLoading) {
    return <PageLoadingState className="rescue-stories-page-shell" />;
  }

  if (error) {
    return <PageErrorState className="rescue-stories-page-shell" message={error} onRetry={reload} />;
  }

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

      <section className="about-page-story-block">
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

      <section className="rescue-stories-page-grid" id="rescue-stories-list">
        <h2 className="rescue-stories-page-list-title">{content.listSection?.title}</h2>

        <div className="rescue-stories-page-filters" aria-label="Филтриране на историите">
          <label>
            Животно
            <select
              value={animalFilter}
              onChange={(event) => updateStoryFilters({ animalType: event.target.value })}
            >
              <option value="">Всички</option>
              {ANIMAL_SPECIES_VALUES.map((animalType) => (
                <option key={animalType} value={animalType}>
                  {ANIMAL_SPECIES_LABELS[animalType] ?? animalType}
                </option>
              ))}
            </select>
          </label>

          <label>
            Статус
            <select
              value={statusFilter}
              onChange={(event) => updateStoryFilters({ outcomeStatus: event.target.value })}
            >
              <option value="">Всички</option>
              {RESCUE_STORY_OUTCOME_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {RESCUE_STORY_OUTCOME_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          {hasActiveFilters ? (
            <button type="button" className="app-secondary-action" onClick={handleClearFilters}>
              Изчисти
            </button>
          ) : null}
        </div>

        {stories.map((story, storyIndex) => (
          <article
            key={story.id ?? story.slug ?? story.title}
            id={storyIndex === 0 ? 'rescue-stories-results-start' : undefined}
            className={`rescue-stories-page-card pagination-scroll-target${
              story.imageUrl ? '' : ' rescue-stories-page-card--without-image'
            }`}
          >
            <div className="rescue-stories-page-card-copy">
              <div className="rescue-stories-page-meta">
                <small>от {story.submittedBy}</small>
                <span className="rescue-story-animal">
                  Животно: {ANIMAL_SPECIES_LABELS[story.animalType] ?? story.animalType}
                </span>
                <span className={`rescue-story-status ${RESCUE_STORY_STATUS_CLASSES[story.outcomeStatus] ?? ''}`}>
                  Статус:{' '}
                  {RESCUE_STORY_OUTCOME_STATUS_LABELS[story.outcomeStatus] ?? story.outcomeStatus}
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
            {content.listSection?.emptyState}
          </p>
        ) : null}

        <PaginationControls
          pagination={pagination}
          isLoading={isStoriesLoading}
          onPageChange={handlePageChange}
          scrollTargetId="rescue-stories-results-start"
        />

        <div className="rescue-stories-page-cta">
          <h2>{content.listSection?.ctaTitle}</h2>
          <PageContentLink className="page-contact-link" to={content.listSection?.ctaTo}>
            {content.listSection?.ctaLabel}
          </PageContentLink>
        </div>
      </section>
    </main>
  );
}
