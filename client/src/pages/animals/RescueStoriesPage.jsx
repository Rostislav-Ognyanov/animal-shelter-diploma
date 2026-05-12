import { Link } from 'react-router-dom';

import { RESCUE_STORIES } from './animalAwarenessData.js';

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
        {RESCUE_STORIES.map((story) => (
          <article key={story.title} className="animals-overview-story-card">
            <small>от {story.submittedBy}</small>
            <h2>{story.title}</h2>
            <p>{story.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
