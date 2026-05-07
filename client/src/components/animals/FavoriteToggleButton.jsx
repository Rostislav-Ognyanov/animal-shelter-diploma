import { useAuth } from '../../auth/AuthProvider.jsx';
import { useFavorites } from '../../favorites/FavoritesProvider.jsx';

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

export function FavoriteToggleButton({ animal, variant = 'card', className = '', onFeedback }) {
  const { role } = useAuth();
  const { addFavorite, isFavorite, isLoading, isPending, removeFavorite } = useFavorites();

  if (role !== 'client') {
    return null;
  }

  const animalId = String(animal?.id ?? '').trim();

  if (!animalId) {
    return null;
  }

  const isAnimalFavorite = isFavorite(animalId);
  const isBusy = isPending(animalId) || isLoading;
  const isDetailVariant = variant === 'detail';
  const actionLabel = isAnimalFavorite ? 'Премахни от любими' : 'Добави в любими';
  const accessibleLabel = isBusy ? 'Изчакване...' : actionLabel;

  async function handleClick() {
    try {
      const result = isAnimalFavorite ? await removeFavorite(animalId) : await addFavorite(animal);

      if (result?.message && typeof onFeedback === 'function') {
        onFeedback({
          type: 'success',
          message: result.message,
        });
      }
    } catch (error) {
      if (typeof onFeedback === 'function') {
        onFeedback({
          type: 'error',
          message: error.message,
        });
      }
    }
  }

  return (
    <button
      type="button"
      className={joinClassNames(
        'favorite-toggle-button',
        `favorite-toggle-${variant}`,
        isAnimalFavorite ? 'is-active' : '',
        className
      )}
      disabled={isBusy}
      aria-label={accessibleLabel}
      aria-pressed={isAnimalFavorite}
      title={actionLabel}
      onClick={handleClick}
    >
      {isDetailVariant ? (
        accessibleLabel
      ) : (
        <span className="favorite-toggle-icon" aria-hidden="true">
          {isBusy ? '…' : isAnimalFavorite ? '♥' : '♡'}
        </span>
      )}
    </button>
  );
}
