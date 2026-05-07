import {
  sendCollectionSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  addOwnFavoriteAnimal,
  getFavoritesModulePolicy,
  getOwnFavoriteAnimals,
  removeOwnFavoriteAnimal,
} from './favorites.service.js';

function buildFavoritesPolicy(roleCandidate) {
  return {
    policy: getFavoritesModulePolicy(roleCandidate),
  };
}

export async function listOwnFavorites(req, res, next) {
  try {
    const items = await getOwnFavoriteAnimals(req.user);

    return sendCollectionSuccess(res, {
      message: 'Любимите животни са заредени успешно.',
      items,
      total: items.length,
      data: buildFavoritesPolicy(req.user?.role),
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
        ...result.item,
        created: result.created,
        ...buildFavoritesPolicy(req.user?.role),
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteFavoriteEntry(req, res, next) {
  try {
    const result = await removeOwnFavoriteAnimal(req.params.animalId, req.user);

    return sendMutationSuccess(res, {
      message: result.removed
        ? 'Животното е премахнато от любими.'
        : 'Животното вече не е в любими.',
      data: {
        animalId: result.animalId,
        removed: result.removed,
        ...buildFavoritesPolicy(req.user?.role),
      },
    });
  } catch (error) {
    return next(error);
  }
}

