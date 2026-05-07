import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../auth/AuthProvider.jsx';
import { deleteJson, fetchJson, postJson } from '../lib/api.js';

const FavoritesContext = createContext(null);

function normalizeAnimalId(animalId) {
  return String(animalId ?? '').trim();
}

function sortFavoriteItems(items = []) {
  return [...items].sort((leftItem, rightItem) => {
    const leftCreatedAt = new Date(leftItem.favoritedAt ?? 0).getTime();
    const rightCreatedAt = new Date(rightItem.favoritedAt ?? 0).getTime();
    return rightCreatedAt - leftCreatedAt;
  });
}

function buildEmptyState() {
  return {
    items: [],
    isLoading: false,
    error: '',
    pendingAnimalIds: [],
  };
}

export function FavoritesProvider({ children }) {
  const { currentUser, role, isLoading: isAuthLoading } = useAuth();
  const [favoritesState, setFavoritesState] = useState(buildEmptyState);

  useEffect(() => {
    if (isAuthLoading) {
      return undefined;
    }

    if (role !== 'client' || !currentUser?.id) {
      setFavoritesState(buildEmptyState());
      return undefined;
    }

    let isMounted = true;

    async function loadFavorites() {
      try {
        setFavoritesState((currentValue) => ({
          ...currentValue,
          isLoading: true,
          error: '',
        }));

        const payload = await fetchJson('/api/favorites');

        if (!isMounted) {
          return;
        }

        setFavoritesState((currentValue) => ({
          ...currentValue,
          items: sortFavoriteItems(payload.items ?? []),
          isLoading: false,
          error: '',
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFavoritesState((currentValue) => ({
          ...currentValue,
          isLoading: false,
          error: error.message,
        }));
      }
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, isAuthLoading, role]);

  const favoriteIds = useMemo(
    () => new Set(favoritesState.items.map((item) => normalizeAnimalId(item.id))),
    [favoritesState.items]
  );
  const pendingIdSet = useMemo(
    () => new Set(favoritesState.pendingAnimalIds.map((animalId) => normalizeAnimalId(animalId))),
    [favoritesState.pendingAnimalIds]
  );

  function assertClientAccess() {
    if (role !== 'client' || !currentUser?.id) {
      throw new Error('Любими животни са достъпни само за клиентски профил.');
    }
  }

  function setPendingState(animalId, isPending) {
    const normalizedAnimalId = normalizeAnimalId(animalId);

    setFavoritesState((currentValue) => {
      const nextPendingAnimalIds = new Set(currentValue.pendingAnimalIds.map((entry) => normalizeAnimalId(entry)));

      if (isPending) {
        nextPendingAnimalIds.add(normalizedAnimalId);
      } else {
        nextPendingAnimalIds.delete(normalizedAnimalId);
      }

      return {
        ...currentValue,
        pendingAnimalIds: Array.from(nextPendingAnimalIds),
      };
    });
  }

  async function reloadFavorites() {
    assertClientAccess();

    try {
      setFavoritesState((currentValue) => ({
        ...currentValue,
        isLoading: true,
        error: '',
      }));

      const payload = await fetchJson('/api/favorites');
      const nextItems = sortFavoriteItems(payload.items ?? []);

      setFavoritesState((currentValue) => ({
        ...currentValue,
        items: nextItems,
        isLoading: false,
        error: '',
      }));

      return nextItems;
    } catch (error) {
      setFavoritesState((currentValue) => ({
        ...currentValue,
        isLoading: false,
        error: error.message,
      }));
      throw error;
    }
  }

  async function addFavorite(animal) {
    assertClientAccess();

    const animalId = normalizeAnimalId(animal?.id);

    if (!animalId) {
      throw new Error('Животното не може да бъде добавено в любими.');
    }

    if (pendingIdSet.has(animalId)) {
      return null;
    }

    setPendingState(animalId, true);

    try {
      const favoriteAnimal = await postJson(`/api/favorites/${animalId}`, {});

      setFavoritesState((currentValue) => {
        const nextItems = currentValue.items.filter((item) => normalizeAnimalId(item.id) !== animalId);
        nextItems.unshift(favoriteAnimal);

        return {
          ...currentValue,
          items: sortFavoriteItems(nextItems),
          error: '',
        };
      });

      return {
        item: favoriteAnimal,
        message: favoriteAnimal?.created === false ? 'Животното вече е в любими.' : 'Животното е добавено в любими.',
      };
    } catch (error) {
      setFavoritesState((currentValue) => ({
        ...currentValue,
        error: error.message,
      }));
      throw error;
    } finally {
      setPendingState(animalId, false);
    }
  }

  async function removeFavorite(animalId) {
    assertClientAccess();

    const normalizedAnimalId = normalizeAnimalId(animalId);

    if (!normalizedAnimalId) {
      throw new Error('Животното не може да бъде премахнато от любими.');
    }

    if (pendingIdSet.has(normalizedAnimalId)) {
      return null;
    }

    setPendingState(normalizedAnimalId, true);

    try {
      const payload = await deleteJson(`/api/favorites/${normalizedAnimalId}`);

      setFavoritesState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.filter((item) => normalizeAnimalId(item.id) !== normalizedAnimalId),
        error: '',
      }));

      return {
        animalId: payload?.animalId ?? normalizedAnimalId,
        removed: payload?.removed ?? true,
        message:
          payload?.removed === false
            ? 'Животното вече не е в любими.'
            : 'Животното е премахнато от любими.',
      };
    } catch (error) {
      setFavoritesState((currentValue) => ({
        ...currentValue,
        error: error.message,
      }));
      throw error;
    } finally {
      setPendingState(normalizedAnimalId, false);
    }
  }

  const value = {
    items: favoritesState.items,
    isLoading: favoritesState.isLoading,
    error: favoritesState.error,
    reloadFavorites,
    addFavorite,
    removeFavorite,
    isFavorite: (animalId) => favoriteIds.has(normalizeAnimalId(animalId)),
    isPending: (animalId) => pendingIdSet.has(normalizeAnimalId(animalId)),
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider.');
  }

  return context;
}

