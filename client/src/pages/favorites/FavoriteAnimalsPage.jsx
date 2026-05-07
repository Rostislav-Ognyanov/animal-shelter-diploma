import { Link } from 'react-router-dom';

import { AnimalCard } from '../../components/animals/AnimalCard.jsx';
import { useFavorites } from '../../favorites/FavoritesProvider.jsx';

export function FavoriteAnimalsPage() {
  const { error, isLoading, items, reloadFavorites } = useFavorites();

  return (
    <main className="route-shell favorites-shell">
      <section className="profile-hero favorites-hero">
        <div>
          <h1>Любими животни</h1>
          <p>Запази животните, към които искаш да се върнеш по-късно.</p>
        </div>
      </section>

      <div className="route-actions favorites-actions">
        <Link className="animals-secondary-action" to="/profile">
          Към профила
        </Link>
        <Link className="animals-primary-action" to="/search">
          Разгледай животните
        </Link>
      </div>

      <section className="route-card favorites-summary-card">
        <strong>{items.length}</strong>
        <span>{items.length === 1 ? 'любимо животно' : 'любими животни'}</span>
      </section>

      <section className="favorites-list-section">
        {isLoading ? (
          <div className="adoptions-empty-state">
            <h2>Зареждане на любимите животни</h2>
            <p>Моля, изчакай.</p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="adoptions-empty-state">
            <h2>Любимите животни не могат да се заредят</h2>
            <p>{error}</p>
            <button type="button" className="animals-primary-action" onClick={() => reloadFavorites()}>
              Опитай отново
            </button>
          </div>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <div className="adoptions-empty-state">
            <h2>Все още нямаш любими животни</h2>
            <p>Добави животни в любими от списъка или от детайлната им страница.</p>
            <Link className="animals-primary-action" to="/search">
              Към животните
            </Link>
          </div>
        ) : null}

        {!isLoading && !error && items.length > 0 ? (
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
