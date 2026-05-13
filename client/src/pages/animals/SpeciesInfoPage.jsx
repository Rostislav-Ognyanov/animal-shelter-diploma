import { Link, useParams } from 'react-router-dom';

import { SPECIES_SHOWCASE_ITEMS } from './animalAwarenessData.js';
import { buildAnimalsSearchPath } from './animalsListQuery.js';
import { SPECIES_FACTS } from './speciesFactsData.js';

export function SpeciesInfoPage() {
  const { species } = useParams();
  const facts = SPECIES_FACTS[species];
  const speciesItem = SPECIES_SHOWCASE_ITEMS.find((item) => item.value === species);

  if (!facts || !speciesItem) {
    return (
      <main className="route-shell species-info-shell">
        <section className="species-info-not-found">
          <h1>Информацията не беше намерена</h1>
          <p>Избери вид от страницата с животните.</p>
          <Link className="animals-primary-action" to="/za-zhivotnite">
            Към животните
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="route-shell species-info-shell">
      <section className="species-info-hero">
        <div className="species-info-hero-copy">
          <Link className="animals-secondary-action" to="/za-zhivotnite">
            Назад към видовете
          </Link>
          <h1>{facts.title}</h1>
          <p>{facts.subtitle}</p>
          <Link className="animals-primary-action" to={buildAnimalsSearchPath({ species })}>
            Виж животните за осиновяване
          </Link>
        </div>

        <div className="species-info-hero-image">
          <img src={speciesItem.imageSrc} alt={speciesItem.imageAlt} />
        </div>
      </section>

      <section className="species-info-chapters">
        {facts.chapters.map((chapter) => (
          <article key={chapter.title} className="species-info-chapter">
            <h2>{chapter.title}</h2>
            {chapter.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}
