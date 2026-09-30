import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../auth/AuthProvider.jsx';
import { deleteJson, fetchJson, postJson } from '../lib/api.js';

const FavoritesContext = createContext(null);

function normalizeAnimalId(animalId) {
  return String(animalId ?? '').trim();
}

function normalizeFavoriteId(favoriteId) {
  return String(favoriteId ?? '').trim();
}

function getFavoriteTimestamp(item) {
  const timestamp = Date.parse(item?.favoritedAt ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortFavoriteItems(items) {
  const favoriteItems = Array.isArray(items) ? items : [];

  return [...favoriteItems].sort((firstItem, secondItem) => {
    const timestampDifference = getFavoriteTimestamp(secondItem) - getFavoriteTimestamp(firstItem);

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    return normalizeFavoriteId(secondItem?.favoriteId).localeCompare(
      normalizeFavoriteId(firstItem?.favoriteId)
    );
  });
}

async function fetchFavoriteItems() {
  const payload = await fetchJson('/api/favorites');
  return sortFavoriteItems(payload.items ?? []);
}

function buildEmptyState() {
  return {
    items: [],
    isLoading: false,
    loadError: '',
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
          loadError: '',
        }));

        const nextItems = await fetchFavoriteItems();

        if (!isMounted) {
          return;
        }

        setFavoritesState((currentValue) => ({
          ...currentValue,
          items: nextItems,
          isLoading: false,
          loadError: '',
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFavoritesState((currentValue) => ({
          ...currentValue,
          isLoading: false,
          loadError: error.message,
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
  const favoriteIdsByAnimalId = useMemo(
    () =>
      new Map(
        favoritesState.items
          .map((item) => [normalizeAnimalId(item.id), normalizeFavoriteId(item.favoriteId)])
          .filter(([, favoriteId]) => favoriteId)
      ),
    [favoritesState.items]
  );
  const pendingIdSet = useMemo(
    () => new Set(favoritesState.pendingAnimalIds.map((entryId) => normalizeAnimalId(entryId))),
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
        loadError: '',
      }));

      const nextItems = await fetchFavoriteItems();

      setFavoritesState((currentValue) => ({
        ...currentValue,
        items: nextItems,
        isLoading: false,
        loadError: '',
      }));

      return nextItems;
    } catch (error) {
      setFavoritesState((currentValue) => ({
        ...currentValue,
        isLoading: false,
        loadError: error.message,
      }));
      return null;
    }
  }

  async function addFavorite(animalId) {
    assertClientAccess();

    const normalizedAnimalId = normalizeAnimalId(animalId);

    if (!normalizedAnimalId) {
      throw new Error('Животното не може да бъде добавено в любими.');
    }

    if (pendingIdSet.has(normalizedAnimalId)) {
      return null;
    }

    setPendingState(normalizedAnimalId, true);

    try {
      const payload = await postJson(`/api/favorites/${normalizedAnimalId}`, {});
      const favoriteAnimal = payload?.item;
      const favoriteAnimalId = normalizeAnimalId(favoriteAnimal?.id);
      const favoriteRelationId = normalizeFavoriteId(favoriteAnimal?.favoriteId);

      setFavoritesState((currentValue) => {
        const nextItems = currentValue.items.filter(
          (item) =>
            normalizeAnimalId(item.id) !== normalizedAnimalId &&
            normalizeAnimalId(item.id) !== favoriteAnimalId &&
            normalizeFavoriteId(item.favoriteId) !== favoriteRelationId
        );

        return {
          ...currentValue,
          items: sortFavoriteItems(favoriteAnimal ? [favoriteAnimal, ...nextItems] : nextItems),
        };
      });

      return {
        item: favoriteAnimal,
        message: payload?.created === false ? 'Животното вече е в любими.' : 'Животното е добавено в любими.',
      };
    } finally {
      setPendingState(normalizedAnimalId, false);
    }
  }

  async function removeFavorite(animalId, favoriteIdCandidate = '') {
    assertClientAccess();

    const normalizedAnimalId = normalizeAnimalId(animalId);
    const normalizedFavoriteId =
      normalizeFavoriteId(favoriteIdCandidate) ||
      favoriteIdsByAnimalId.get(normalizedAnimalId) ||
      '';

    if (!normalizedFavoriteId) {
      throw new Error('Животното не може да бъде премахнато от любими.');
    }

    if (pendingIdSet.has(normalizedAnimalId) || pendingIdSet.has(normalizedFavoriteId)) {
      return null;
    }

    setPendingState(normalizedFavoriteId, true);

    try {
      const payload = await deleteJson(`/api/favorites/${normalizedFavoriteId}`);
      const removedAnimalId = normalizeAnimalId(payload?.animalId ?? normalizedAnimalId);
      const removedFavoriteId = normalizeFavoriteId(payload?.favoriteId ?? normalizedFavoriteId);

      setFavoritesState((currentValue) => ({
        ...currentValue,
        items: currentValue.items.filter(
          (item) =>
            normalizeAnimalId(item.id) !== normalizedAnimalId &&
            normalizeAnimalId(item.id) !== removedAnimalId &&
            normalizeFavoriteId(item.favoriteId) !== removedFavoriteId
        ),
      }));

      return {
        favoriteId: removedFavoriteId,
        animalId: removedAnimalId,
        removed: payload?.removed ?? true,
        message:
          payload?.removed === false
            ? 'Животното вече не е в любими.'
            : 'Животното е премахнато от любими.',
      };
    } finally {
      setPendingState(normalizedFavoriteId, false);
    }
  }

  const value = {
    items: favoritesState.items,
    isLoading: favoritesState.isLoading,
    loadError: favoritesState.loadError,
    reloadFavorites,
    addFavorite,
    removeFavorite,
    getFavoriteId: (animalId) => favoriteIdsByAnimalId.get(normalizeAnimalId(animalId)) ?? '',
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

