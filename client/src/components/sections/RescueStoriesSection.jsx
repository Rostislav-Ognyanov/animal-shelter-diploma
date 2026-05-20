import { Link } from 'react-router-dom';

import { RESCUE_STORIES } from '../../pages/animals/animalAwarenessData.js';

export function RescueStoriesSection() {
  return (
    <section className="rescue-stories" id="rescue-stories-section">
      <div className="section-container rescue-stories-container">
        <div className="section-heading rescue-stories-heading">
          <div>
            <h2>Истории за спасявания</h2>
            <p>Някои от животните ни стигат до приюта след трудни ситуации, но с лечение, грижа и време успяват да започнат отначало.</p>
          </div>
        </div>

        <div className="rescue-stories-grid">
          {RESCUE_STORIES.slice(0, 3).map((story) => (
            <article key={story.title} className="rescue-story-card">
              <h3>{story.title}</h3>
              <p>{story.text}</p>
            </article>
          ))}
        </div>

        <Link className="about-page-contact-link rescue-stories-more-link" to="/istorii-za-spasyavaniya">
          Виж повече
        </Link>
      </div>
    </section>
  );
}
