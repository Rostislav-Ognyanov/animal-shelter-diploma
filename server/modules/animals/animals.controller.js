import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import { createHttpError } from '../../utils/httpError.js';
import {
  createAnimal,
  deactivateAnimal,
  getAnimalById,
  getAnimalModulePolicy,
  getAnimalsCollection,
  updateAnimal,
  updateAnimalStatus,
} from './animals.service.js';

function readAnimalListFilters(query = {}) {
  return {
    query: query.query,
    species: query.species ?? query.type,
    size: query.size,
    status: query.status,
    page: query.page,
    limit: query.limit,
    sort: query.sort,
  };
}

function buildAnimalResponseData(animal, roleCandidate) {
  return {
    ...animal,
    policy: getAnimalModulePolicy(roleCandidate),
  };
}

export async function listAnimals(req, res, next) {
  try {
    const animalFilters = readAnimalListFilters(req.query);
    const animalCollection = await getAnimalsCollection(animalFilters);

    return sendCollectionSuccess(res, {
      message: 'Списъкът с животни е зареден успешно.',
      items: animalCollection.items,
      total: animalCollection.total,
      data: {
        policy: getAnimalModulePolicy(req.user?.role ?? 'guest'),
      },
      meta: {
        pagination: animalCollection.pagination,
        sort: animalCollection.sort,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAnimal(req, res, next) {
  try {
    const animal = await getAnimalById(req.params.animalId);

    if (!animal) {
      throw createHttpError(404, 'Животното не беше намерено.');
    }

    return sendItemSuccess(res, {
      message: 'Данните за животното са заредени успешно.',
      data: buildAnimalResponseData(animal, req.user?.role ?? 'guest'),
    });
  } catch (error) {
    return next(error);
  }
}

export async function createAnimalEntry(req, res, next) {
  try {
    const createdAnimal = await createAnimal(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Животното е създадено успешно.',
      data: buildAnimalResponseData(createdAnimal, req.user?.role ?? 'guest'),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateAnimalEntry(req, res, next) {
  try {
    const updatedAnimal = await updateAnimal(req.params.animalId, req.body);

    return sendMutationSuccess(res, {
      message: 'Данните за животното са обновени успешно.',
      data: buildAnimalResponseData(updatedAnimal, req.user?.role ?? 'guest'),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateAnimalStatusEntry(req, res, next) {
  try {
    const updatedAnimal = await updateAnimalStatus(req.params.animalId, req.body);

    return sendMutationSuccess(res, {
      message: 'Статусът на животното е обновен успешно.',
      data: buildAnimalResponseData(updatedAnimal, req.user?.role ?? 'guest'),
    });
  } catch (error) {
    return next(error);
  }
}

export async function deactivateAnimalEntry(req, res, next) {
  try {
    const updatedAnimal = await deactivateAnimal(req.params.animalId, req.body ?? {});

    return sendMutationSuccess(res, {
      message: 'Животното е деактивирано успешно.',
      data: buildAnimalResponseData(updatedAnimal, req.user?.role ?? 'guest'),
    });
  } catch (error) {
    return next(error);
  }
}