import Favorite from '../../models/Favorite.js';
import { createHttpError } from '../../utils/httpError.js';
import { getAnimalById } from '../animals/animals.service.js';
import { getAllowedFavoriteActions, hasPermission } from '../shared/rolePolicies.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeDateOutput(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function serializeFavoriteId(favorite) {
  if (!favorite) {
    return '';
  }

  if (favorite.id) {
    return String(favorite.id);
  }

  if (favorite._id) {
    return String(favorite._id);
  }

  return '';
}

function assertFavoritePermission(currentUser, action) {
  if (!currentUser) {
    throw createHttpError(401, 'Необходимо е да влезеш в профила си, за да използваш любими животни.');
  }

  if (!hasPermission(currentUser.role, 'favorites', action)) {
    throw createHttpError(403, 'Нямаш необходимите права за това действие.');
  }
}

function assertAnimalId(animalId) {
  const normalizedAnimalId = normalizeText(animalId);

  if (!normalizedAnimalId) {
    throw createHttpError(400, 'Липсва идентификатор на животното.');
  }

  return normalizedAnimalId;
}

function serializeFavoriteAnimalItem(favorite, animal) {
  return {
    ...animal,
    favoriteId: serializeFavoriteId(favorite),
    favoritedAt: normalizeDateOutput(favorite.createdAt),
    favorite: {
      id: serializeFavoriteId(favorite),
      animalId: animal.id,
      createdAt: normalizeDateOutput(favorite.createdAt),
    },
  };
}

async function listFavoriteRecordsByUserId(userId) {
  return Favorite.find({ userId: normalizeText(userId) }).sort({ createdAt: -1 }).lean();
}

async function findFavoriteRecordByUserAndAnimalId(userId, animalId) {
  return Favorite.findOne({
    userId: normalizeText(userId),
    animalId: normalizeText(animalId),
  }).lean();
}

async function createFavoriteRecord(userId, animalId) {
  const createdFavorite = await Favorite.create({
    userId: normalizeText(userId),
    animalId: normalizeText(animalId),
  });

  return createdFavorite.toObject();
}

async function deleteFavoriteRecord(userId, animalId) {
  await Favorite.deleteOne({
    userId: normalizeText(userId),
    animalId: normalizeText(animalId),
  });
}

async function resolveFavoriteAnimal(animalId) {
  const normalizedAnimalId = assertAnimalId(animalId);
  const animal = await getAnimalById(normalizedAnimalId);

  if (!animal) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  return animal;
}

export function getFavoritesModulePolicy(roleCandidate) {
  return {
    resource: 'favorites',
    allowedActions: getAllowedFavoriteActions(roleCandidate),
  };
}

export async function getOwnFavoriteAnimals(currentUser) {
  assertFavoritePermission(currentUser, 'list-own');
  const favoriteRecords = await listFavoriteRecordsByUserId(currentUser.id);
  const favoriteAnimals = [];

  for (const favoriteRecord of favoriteRecords) {
    const animal = await getAnimalById(favoriteRecord.animalId);

    if (!animal) {
      continue;
    }

    favoriteAnimals.push(serializeFavoriteAnimalItem(favoriteRecord, animal));
  }

  return favoriteAnimals;
}

export async function addOwnFavoriteAnimal(animalId, currentUser) {
  assertFavoritePermission(currentUser, 'create-own');
  const animal = await resolveFavoriteAnimal(animalId);
  const existingFavorite = await findFavoriteRecordByUserAndAnimalId(currentUser.id, animal.id);

  if (existingFavorite) {
    return {
      created: false,
      item: serializeFavoriteAnimalItem(existingFavorite, animal),
    };
  }

  try {
    const createdFavorite = await createFavoriteRecord(currentUser.id, animal.id);

    return {
      created: true,
      item: serializeFavoriteAnimalItem(createdFavorite, animal),
    };
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateFavorite = await findFavoriteRecordByUserAndAnimalId(currentUser.id, animal.id);

      if (duplicateFavorite) {
        return {
          created: false,
          item: serializeFavoriteAnimalItem(duplicateFavorite, animal),
        };
      }
    }

    throw error;
  }
}

export async function removeOwnFavoriteAnimal(animalId, currentUser) {
  assertFavoritePermission(currentUser, 'remove-own');
  const requestedAnimalId = assertAnimalId(animalId);
  const existingAnimal = await getAnimalById(requestedAnimalId);
  const canonicalAnimalId = existingAnimal?.id ?? requestedAnimalId;
  const existingFavorite = await findFavoriteRecordByUserAndAnimalId(currentUser.id, canonicalAnimalId);

  if (!existingFavorite) {
    return {
      removed: false,
      animalId: canonicalAnimalId,
    };
  }

  await deleteFavoriteRecord(currentUser.id, canonicalAnimalId);

  return {
    removed: true,
    animalId: canonicalAnimalId,
  };
}
