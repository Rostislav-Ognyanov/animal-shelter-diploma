import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { buildPublicAssetPath } from '../../lib/publicAssetPath.js';
import { RESCUE_STORIES_PAGE_ITEMS } from './rescueStoriesPageData.js';

const STORY_STATUSES = ['Осиновено', 'Възстановено', 'Върнато в природата'];

const STORY_STATUS_CLASS = {
  Осиновено: 'is-adopted',
  Възстановено: 'is-recovered',
  'Върнато в природата': 'is-released',
};

export function RescueStoriesPage() {
  const [animalFilter, setAnimalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const animalTypes = useMemo(
    () => [...new Set(RESCUE_STORIES_PAGE_ITEMS.map((story) => story.animalType))],
    []
  );

  const filteredStories = useMemo(
    () =>
      RESCUE_STORIES_PAGE_ITEMS.filter(
        (story) =>
          (!animalFilter || story.animalType === animalFilter) &&
          (!statusFilter || story.status === statusFilter)
      ),
    [animalFilter, statusFilter]
  );

  const hasActiveFilters = Boolean(animalFilter || statusFilter);

  const handleClearFilters = () => {
    setAnimalFilter('');
    setStatusFilter('');
  };

  return (
    <main className="route-shell rescue-stories-page-shell">
      <section className="rescue-stories-page-hero">
        <div>
          <h1>Истории за спасявания</h1>
        </div>
      </section>

      <section className="about-page-story-block rescue-stories-page-intro">
        <div className="about-page-split-inner about-page-story-row">
          <article className="about-page-split-copy">
            <h2>Когато помощта променя съдби</h2>
            <p>
              Историите за спасявания показват колко голяма разлика могат да направят навременната помощ, грижата и
              човешката съпричастност. Зад всяко спасено животно стои период на несигурност, възстановяване и постепенно
              връщане към спокойствие и доверие. Тези случаи напомнят, че дори едно подадено съобщение, един жест на
              грижа или една навременна намеса могат да се превърнат в начало на напълно нов живот. Всяка история е
              доказателство, че когато хората и приютът действат заедно, промяната е възможна.
            </p>
          </article>

          <figure className="about-page-split-image">
            <img
              src={buildPublicAssetPath('images/page_images/stories_hero.jpg')}
              alt="Животно, получило грижа и нов шанс"
            />
          </figure>
        </div>
      </section>

      <section className="rescue-stories-page-grid">
        <h2 className="rescue-stories-page-list-title">Истории на надежда и промяна</h2>

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
              {STORY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
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
          <article key={story.title} className="rescue-stories-page-card">
            <div className="rescue-stories-page-card-copy">
              <div className="rescue-stories-page-meta">
                <small>от {story.submittedBy}</small>
                <span className="rescue-story-animal">Животно: {story.animalType}</span>
                <span className={`rescue-story-status ${STORY_STATUS_CLASS[story.status] ?? ''}`}>
                  Статус: {story.status}
                </span>
              </div>
              <h2>{story.title}</h2>
              <p>{story.text}</p>
            </div>

            <figure className="rescue-stories-page-image">
              <img src={buildPublicAssetPath(story.imageSrc)} alt={story.imageAlt} />
            </figure>
          </article>
        ))}

        {filteredStories.length === 0 ? (
          <p className="rescue-stories-page-empty" role="status">
            Няма истории, които да съвпадат с избраните филтри. Опитайте с друг вид животно или статус.
          </p>
        ) : null}

        <div className="rescue-stories-page-cta">
          <h2>Искаш и ти да помогнеш?</h2>
          <Link className="about-page-contact-link" to="/podkrepa">
            Виж как
          </Link>
        </div>
      </section>
    </main>
  );
}
