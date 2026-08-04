import { PageContentLink } from '../../pages/page-content/PageContentLink.jsx';
import { DEFAULT_RESCUE_STORIES } from '../../pages/animals/rescueStoriesData.js';
import { usePublishedRescueStories } from '../../pages/animals/useRescueStories.js';
import { truncateContentText } from '../../pages/page-content/pageContentUtils.js';

const DEFAULT_FEATURED_STORIES = DEFAULT_RESCUE_STORIES.filter((story) => story.isFeatured).slice(0, 3);

export function RescueStoriesSection({ section = {} }) {
  const { stories } = usePublishedRescueStories(
    { featured: true, limit: 3 },
    DEFAULT_FEATURED_STORIES
  );

  return (
    <section className="rescue-stories" id="rescue-stories-section">
      <div className="section-container rescue-stories-container">
        <div className="section-heading rescue-stories-heading">
          <div>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </div>
        </div>

        <div className="rescue-stories-grid">
          {stories.map((story) => (
            <article key={story.id ?? story.slug ?? story.title} className="rescue-story-card">
              <h3>{story.title}</h3>
              <p>{truncateContentText(story.summary || story.content)}</p>
            </article>
          ))}
        </div>

        <PageContentLink className="about-page-contact-link rescue-stories-more-link" to={section.ctaTo}>
          {section.ctaLabel}
        </PageContentLink>
      </div>
    </section>
  );
}
