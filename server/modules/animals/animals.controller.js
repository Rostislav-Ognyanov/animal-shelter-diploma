import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import { createHttpError } from '../../utils/httpError.js';
import { hasPermission } from '../shared/rolePolicies.js';
import {
  createAnimal,
  deactivateAnimal,
  getAnimalById,
  getAnimalsCollection,
  updateAnimal,
  updateAnimalStatus,
} from './animals.service.js';

function readAnimalListFilters(query = {}) {
  return {
    query: query.query,
    species: query.species ?? query.type,
    gender: query.gender,
    size: query.size,
    status: query.status,
    page: query.page,
    limit: query.limit,
    sort: query.sort,
  };
}

function canViewAnimalManagementData(roleCandidate) {
  return hasPermission(roleCandidate, 'animals', 'view-all');
}

function stripInternalAnimalFields(animal) {
  const { createdAt, isActive, updatedAt, ...publicAnimal } = animal;
  return publicAnimal;
}

function buildAnimalResponseData(animal, roleCandidate) {
  if (!canViewAnimalManagementData(roleCandidate)) {
    return stripInternalAnimalFields(animal);
  }

  return animal;
}

export async function listAnimals(req, res, next) {
  try {
    const animalFilters = readAnimalListFilters(req.query);
    const role = req.user?.role ?? 'guest';
    const canViewManagementData = canViewAnimalManagementData(role);
    const animalCollection = await getAnimalsCollection(animalFilters, req.user);
    const responseItems = canViewManagementData
      ? animalCollection.items
      : animalCollection.items.map(stripInternalAnimalFields);

    return sendCollectionSuccess(res, {
      message: 'Списъкът с животни е зареден успешно.',
      items: responseItems,
      total: animalCollection.total,
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
    const animal = await getAnimalById(req.params.animalId, req.user ?? null, {
      restrictToPublicAnimal: true,
      publicVisibility: 'detail',
    });

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
    const createdAnimal = await createAnimal(req.body, req.user);

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
    const updatedAnimal = await updateAnimal(req.params.animalId, req.body, req.user);

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
    const updatedAnimal = await updateAnimalStatus(req.params.animalId, req.body, req.user);

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
    const message =
      updatedAnimal.status === 'archived'
        ? 'Животното е архивирано успешно.'
        : 'Животното е деактивирано успешно.';

    return sendMutationSuccess(res, {
      message,
      data: buildAnimalResponseData(updatedAnimal, req.user?.role ?? 'guest'),
    });
  } catch (error) {
    return next(error);
  }
}
