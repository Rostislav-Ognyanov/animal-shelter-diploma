import mongoose from 'mongoose';

import Favorite from '../../models/Favorite.js';
import { createHttpError } from '../../utils/httpError.js';
import { normalizeDateOutput } from '../../utils/serialization.js';
import {
  getAnimalReferenceById,
  getAnimalReferencesByIds,
} from '../animals/animals.service.js';
import { hasPermission } from '../shared/rolePolicies.js';

function normalizeText(value) {
  return String(value ?? '').trim();
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

function normalizeObjectId(value, fieldName) {
  const normalizedValue = normalizeText(value);

  if (!mongoose.isValidObjectId(normalizedValue)) {
    throw createHttpError(400, `Полето "${fieldName}" съдържа невалиден идентификатор.`);
  }

  return normalizedValue;
}

function serializeFavoriteAnimalItem(favorite, animal) {
  return {
    favoriteId: String(favorite._id ?? favorite.id),
    ...animal,
    favoritedAt: normalizeDateOutput(favorite.createdAt),
  };
}

async function listFavoriteRecordsByUserId(userId) {
  return Favorite.find({ userId: normalizeObjectId(userId, 'userId') })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
}

async function findFavoriteRecordByUserAndAnimalId(userId, animalId) {
  return Favorite.findOne({
    userId: normalizeObjectId(userId, 'userId'),
    animalId: normalizeObjectId(animalId, 'animalId'),
  }).lean();
}

async function createFavoriteRecord(userId, animalId) {
  const createdFavorite = await Favorite.create({
    userId: normalizeObjectId(userId, 'userId'),
    animalId: normalizeObjectId(animalId, 'animalId'),
  });

  return createdFavorite.toObject();
}

async function findFavoriteRecordById(userId, favoriteId) {
  return Favorite.findOne({
    _id: normalizeObjectId(favoriteId, 'favoriteId'),
    userId: normalizeObjectId(userId, 'userId'),
  }).lean();
}

async function deleteFavoriteRecordById(userId, favoriteId) {
  await Favorite.deleteOne({
    _id: normalizeObjectId(favoriteId, 'favoriteId'),
    userId: normalizeObjectId(userId, 'userId'),
  });
}

async function resolveFavoriteAnimal(animalId, currentUser) {
  const normalizedAnimalId = assertAnimalId(animalId);
  const animalReference = await getAnimalReferenceById(
    normalizedAnimalId,
    currentUser,
    {
      restrictToPublicAnimal: true,
    }
  );

  if (!animalReference) {
    throw createHttpError(404, 'Животното не беше намерено.');
  }

  return animalReference;
}

export async function getOwnFavoriteAnimals(currentUser) {
  assertFavoritePermission(currentUser, 'list-own');
  const favoriteRecords = await listFavoriteRecordsByUserId(currentUser.id);
  const animalReferences = await getAnimalReferencesByIds(
    favoriteRecords.map((favoriteRecord) => favoriteRecord.animalId),
    currentUser,
    {
      restrictToPublicAnimal: true,
      publicVisibility: 'detail',
    }
  );
  const animalItemsByDatabaseId = new Map(
    animalReferences.map((animalReference) => [animalReference.databaseId, animalReference.item])
  );

  return favoriteRecords
    .map((favoriteRecord) => {
      const animal = animalItemsByDatabaseId.get(String(favoriteRecord.animalId));
      return animal && animal.status !== 'adopted'
        ? serializeFavoriteAnimalItem(favoriteRecord, animal)
        : null;
    })
    .filter(Boolean);
}

export async function addOwnFavoriteAnimal(animalId, currentUser) {
  assertFavoritePermission(currentUser, 'create-own');
  const animalReference = await resolveFavoriteAnimal(animalId, currentUser);
  const existingFavorite = await findFavoriteRecordByUserAndAnimalId(
    currentUser.id,
    animalReference.databaseId
  );

  if (existingFavorite) {
    return {
      created: false,
      item: serializeFavoriteAnimalItem(existingFavorite, animalReference.item),
    };
  }

  try {
    const createdFavorite = await createFavoriteRecord(currentUser.id, animalReference.databaseId);

    return {
      created: true,
      item: serializeFavoriteAnimalItem(createdFavorite, animalReference.item),
    };
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateFavorite = await findFavoriteRecordByUserAndAnimalId(
        currentUser.id,
        animalReference.databaseId
      );

      if (duplicateFavorite) {
        return {
          created: false,
          item: serializeFavoriteAnimalItem(duplicateFavorite, animalReference.item),
        };
      }
    }

    throw error;
  }
}

export async function removeOwnFavoriteAnimal(favoriteId, currentUser) {
  assertFavoritePermission(currentUser, 'remove-own');
  const normalizedFavoriteId = normalizeObjectId(favoriteId, 'favoriteId');
  const existingFavorite = await findFavoriteRecordById(currentUser.id, normalizedFavoriteId);

  if (!existingFavorite) {
    return {
      removed: false,
      favoriteId: normalizedFavoriteId,
    };
  }

  await deleteFavoriteRecordById(currentUser.id, normalizedFavoriteId);

  return {
    removed: true,
    favoriteId: normalizedFavoriteId,
    animalId: String(existingFavorite.animalId),
  };
}
