import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { RESCUE_STORIES, SPECIES_SHOWCASE_ITEMS } from './animalAwarenessData.js';

const FEATURED_SPECIES = SPECIES_SHOWCASE_ITEMS.slice(0, 4);

export function AnimalsOverviewPage() {
  return (
    <main className="route-shell animals-overview-shell animals-page-shell">
      <section className="animals-overview-page-hero">
        <div>
          <h1>За нашите животни</h1>
        </div>
      </section>

      <section className="about-page-story-block animals-overview-story-block">
        <div className="about-page-split-inner about-page-story-row animals-overview-story-row">
          <article className="about-page-split-copy animals-overview-story-copy">
            <h2>Животните в нашия приют</h2>
            <p>
              В приюта живеят различни видове животни, всяко със своя характер, нужди и история. Някои от тях се нуждаят
              от повече време и спокойствие, други са по-активни, социални и готови за нов дом. На тази страница можете
              да научите повече за основните видове животни в приюта, за техния начин на живот, поведение и нужди.
              Целта на тази информация е да помогне на всеки посетител по-лесно да се ориентира, да разбере какви грижи
              изисква всеки вид и да направи по-отговорен и информиран избор.
            </p>
            <a className="about-page-contact-link animals-overview-story-action" href="#species-showcase-section">
              Към видовете
            </a>
          </article>

          <figure className="about-page-split-image">
            <img
              src={buildPublicAssetPath('images/page_images/about_animals_hero1.jpg')}
              alt="Животни в приюта"
            />
          </figure>
        </div>

        <div className="about-page-story-divider" aria-hidden="true" />

        <div className="about-page-split-inner about-page-story-row about-page-story-row-reversed animals-overview-story-row">
          <figure className="about-page-split-image">
            <img
              src={buildPublicAssetPath('images/page_images/about_animals_hero2.jpg')}
              alt="Грижа и информация за животните"
            />
          </figure>

          <article className="about-page-split-copy animals-overview-story-copy">
            <h2>Как помощта променя съдби</h2>
            <p>
              Зад всяко животно в приюта стои различен път, изпълнен с трудности, възстановяване и нова надежда.
              Историите за спасявания показват как навременната помощ, постоянната грижа и човешката съпричастност
              могат да променят напълно съдбата на едно животно. Те разкриват не само предизвикателствата, през които
              преминават животните, но и значението на осиновяването, доброволчеството и подкрепата към приюта. Чрез
              тези истории всеки посетител може по-ясно да види реалния смисъл на помощта и възможността да бъде част от
              една положителна промяна.
            </p>
            <a className="about-page-contact-link animals-overview-story-action" href="#rescue-stories-section">
              Невероятни истории
            </a>
          </article>
        </div>
      </section>

      <section className="animals-overview-species-section" id="species-showcase-section">
        <div className="animals-overview-section-heading animals-overview-stories-heading">
          <div className="animals-overview-heading-copy">
            <h2>Информация за животните ни</h2>
            <p>
              Разгледайте основните видове животни в приюта и научете повече за техните особености, поведение и нужди.
            </p>
          </div>
          <Link className="animals-secondary-action" to="/informacia-za-zhivotnite">
            Вижте повече
          </Link>
        </div>

        <div className="animals-overview-species-grid">
          {FEATURED_SPECIES.map((species) => (
            <Link
              key={species.value}
              className="animals-overview-species-card"
              to={`/za-zhivotnite/${species.value}`}
            >
              <img src={buildPublicAssetPath(species.imageSrc)} alt={species.imageAlt} />
              <span>{species.tabLabel}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="animals-overview-stories-section" id="rescue-stories-section">
        <div className="animals-overview-section-heading animals-overview-stories-heading">
          <div className="animals-overview-heading-copy">
            <h2>Истории за спасявания</h2>
            <p>
              Всяка история показва как грижата, търпението и навременната помощ могат да променят напълно съдбата на
              едно животно.
            </p>
          </div>
          <Link className="animals-secondary-action" to="/istorii-za-spasyavaniya">
            Вижте повече
          </Link>
        </div>

        <div className="animals-overview-stories-grid">
          {RESCUE_STORIES.map((story) => (
            <article key={story.title} className="animals-overview-story-card">
              <small>от {story.submittedBy}</small>
              <h3>{story.title}</h3>
              <p>{story.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
