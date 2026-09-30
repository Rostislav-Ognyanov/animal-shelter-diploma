import {
  sendCollectionSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  addOwnFavoriteAnimal,
  getOwnFavoriteAnimals,
  removeOwnFavoriteAnimal,
} from './favorites.service.js';

export async function listOwnFavorites(req, res, next) {
  try {
    const items = await getOwnFavoriteAnimals(req.user);

    return sendCollectionSuccess(res, {
      message: 'Любимите животни са заредени успешно.',
      items,
      total: items.length,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createFavoriteEntry(req, res, next) {
  try {
    const result = await addOwnFavoriteAnimal(req.params.animalId, req.user);

    return sendMutationSuccess(res, {
      status: result.created ? 201 : 200,
      message: result.created
        ? 'Животното е добавено в любими.'
        : 'Животното вече е в любими.',
      data: {
        item: result.item,
        created: result.created,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteFavoriteEntry(req, res, next) {
  try {
    const result = await removeOwnFavoriteAnimal(req.params.favoriteId, req.user);

    return sendMutationSuccess(res, {
      message: result.removed
        ? 'Животното е премахнато от любими.'
        : 'Животното вече не е в любими.',
      data: {
        favoriteId: result.favoriteId,
        animalId: result.animalId,
        removed: result.removed,
      },
    });
  } catch (error) {
    return next(error);
  }
}

