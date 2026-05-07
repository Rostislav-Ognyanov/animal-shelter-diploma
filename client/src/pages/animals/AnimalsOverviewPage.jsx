import { Link } from 'react-router-dom';

import { RescueStoriesSection } from '../../components/sections/RescueStoriesSection.jsx';
import { SpeciesShowcaseSection } from '../../components/sections/SpeciesShowcaseSection.jsx';

export function AnimalsOverviewPage() {
  return (
    <main className="route-shell animals-overview-shell">
      <section className="route-card animals-overview-hero">
        <p className="route-meta">За животните</p>
        <h1>За животните</h1>
        <p>
          Тази страница събира кратка информация за животните в приюта и примери за истории по тяхното спасяване и възстановяване.
        </p>
        <div className="route-actions animals-overview-actions">
          <Link className="animals-primary-action" to="/search">
            Към животните
          </Link>
          <a className="animals-secondary-action" href="#rescue-stories-section">
            Към историите
          </a>
        </div>
      </section>

      <SpeciesShowcaseSection />
      <RescueStoriesSection />
    </main>
  );
}
