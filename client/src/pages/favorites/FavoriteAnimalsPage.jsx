import { Link } from 'react-router-dom';

import { AnimalCard } from '../../components/animals/AnimalCard.jsx';
import { AnimalsListSkeleton } from '../../components/animals/AnimalsListSkeleton.jsx';
import { useFavorites } from '../../favorites/FavoritesProvider.jsx';

export function FavoriteAnimalsPage() {
  const { isLoading, items, loadError, reloadFavorites } = useFavorites();

  return (
    <main className="route-shell favorites-shell">
      <section className="profile-hero">
        <div>
          <h1>Любими животни</h1>
          <p>Запази животните, към които искаш да се върнеш по-късно.</p>
        </div>
      </section>

      <div className="route-actions">
        <Link className="app-secondary-action" to="/profile">
          Към профила
        </Link>
        <Link className="app-primary-action" to="/animals">
          Разгледай животните
        </Link>
      </div>

      <section className="route-card favorites-summary-card">
        <strong>{items.length}</strong>
        <span>{items.length === 1 ? 'любимо животно' : 'любими животни'}</span>
      </section>

      <section className="favorites-list-section">
        {isLoading ? (
          <AnimalsListSkeleton
            count={4}
            gridClassName="animals-grid favorites-grid"
            statusText="Зареждане на любимите животни..."
          />
        ) : null}

        {!isLoading && loadError ? (
          <div className="adoptions-empty-state">
            <h2>Любимите животни не могат да се заредят</h2>
            <p>{loadError}</p>
            <button type="button" className="app-primary-action" onClick={() => reloadFavorites()}>
              Опитай отново
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError && items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>Все още нямаш любими животни</h2>
            <p>Добави животни в любими от списъка или от детайлната им страница.</p>
            <Link className="app-primary-action" to="/animals">
              Към животните
            </Link>
          </div>
        ) : null}

        {!isLoading && !loadError && items.length > 0 ? (
          <div className="animals-grid favorites-grid">
            {items.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
