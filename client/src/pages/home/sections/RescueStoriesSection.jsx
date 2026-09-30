import { usePublishedRescueStories } from '../../animals/useRescueStories.js';
import { PageContentLink } from '../../page-content/PageContentLink.jsx';
import { truncateContentText } from '../../page-content/pageContentUtils.js';

export function RescueStoriesSection({ section = {} }) {
  const storyCount = Number.isFinite(Number(section.count)) ? Number(section.count) : 3;
  const { stories, errorMessage, isLoading } = usePublishedRescueStories({ random: true, limit: storyCount });

  return (
    <section className="rescue-stories" id="rescue-stories-section">
      <div className="section-container rescue-stories-container">
        <div className="section-heading rescue-stories-heading">
          <div>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
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

        {isLoading ? (
          <p className="content-state-message" role="status">
            Зареждане...
          </p>
        ) : errorMessage ? (
          <p className="content-state-message" role="alert">
            {errorMessage}
          </p>
        ) : stories.length === 0 ? (
          <p className="content-state-message" role="status">
            Няма публикувани истории.
          </p>
        ) : null}

        <PageContentLink
          className="page-contact-link rescue-stories-preview-more-link"
          to={section.ctaTo}
        >
          {section.ctaLabel}
        </PageContentLink>
      </div>
    </section>
  );
}
