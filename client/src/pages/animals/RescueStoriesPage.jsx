import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { RESCUE_STORIES_PAGE_ITEMS } from './rescueStoriesPageData.js';

export function RescueStoriesPage() {
  return (
    <main className="route-shell rescue-stories-page-shell">
      <section className="animals-overview-section-heading rescue-stories-page-heading">
        <div>
          <h1>Истории за спасявания</h1>
          <p>Реални примери за възстановяване, грижа и нов шанс.</p>
        </div>
        <Link className="animals-secondary-action" to="/za-zhivotnite">
          Назад към животните
        </Link>
      </section>

      <section className="rescue-stories-page-grid">
        {RESCUE_STORIES_PAGE_ITEMS.map((story) => (
          <article key={story.title} className="rescue-stories-page-card">
            <div className="rescue-stories-page-card-copy">
              <small>от {story.submittedBy}</small>
              <h2>{story.title}</h2>
              <p>{story.text}</p>
            </div>

            <figure className="rescue-stories-page-image">
              <img src={buildPublicAssetPath(story.imageSrc)} alt={story.imageAlt} />
            </figure>
          </article>
        ))}
      </section>
    </main>
  );
}
