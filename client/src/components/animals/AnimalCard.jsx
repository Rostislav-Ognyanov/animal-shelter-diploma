import { Link } from 'react-router-dom';

import { FavoriteToggleButton } from './FavoriteToggleButton.jsx';
import { AnimalImage } from './AnimalImage.jsx';
import { AnimalStatusBadge } from './AnimalStatusBadge.jsx';

export function AnimalCard({ animal, showManageLink = false }) {
  const visibleName = animal.displayName ?? animal.name;
  const description = animal.description ?? animal.shortDescription ?? 'Очаква описание от екипа на приюта.';

  return (
    <article className="animal-card">
      <AnimalImage src={animal.imageUrl ?? animal.image} alt={visibleName} />
      <div className="animal-card-body">
        <AnimalStatusBadge status={animal.status} statusLabel={animal.statusLabel} />
        <h3>{visibleName}</h3>
        <p className="animal-facts">{animal.facts}</p>
        <p className="animal-description">{description}</p>

        <div className="animal-card-actions">
          <Link className="animal-card-link" to={`/animals/${animal.id}`}>
            Подробности
          </Link>
          <FavoriteToggleButton animal={animal} />
          {showManageLink ? (
            <Link className="animal-card-manage-link" to={`/animals/${animal.id}/edit`}>
              Редакция
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
