import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  cancelAdoptionRequest,
  createAdoptionRequest,
  getAdoptionRequestById,
  getAllAdoptionRequestCollection,
  getOwnAdoptionRequestCollection,
  updateAdoptionRequestStatus,
} from './adoptions.service.js';

function readAdoptionRequestFilters(query = {}) {
  return {
    status: query.status,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };
}

export async function createAdoptionRequestEntry(req, res, next) {
  try {
    const createdAdoptionRequest = await createAdoptionRequest(req.body, req.user);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Заявката за осиновяване е създадена успешно.',
      data: createdAdoptionRequest,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listOwnAdoptionRequests(req, res, next) {
  try {
    const adoptionFilters = readAdoptionRequestFilters(req.query);
    const adoptionRequestCollection = await getOwnAdoptionRequestCollection(req.user, adoptionFilters);

    return sendCollectionSuccess(res, {
      message: 'Твоите заявки за осиновяване са заредени успешно.',
      items: adoptionRequestCollection.items,
      total: adoptionRequestCollection.total,
      meta: {
        filters: adoptionFilters,
        pagination: adoptionRequestCollection.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function listAdoptionRequests(req, res, next) {
  try {
    const adoptionFilters = readAdoptionRequestFilters(req.query);
    const adoptionRequestCollection = await getAllAdoptionRequestCollection(req.user, adoptionFilters);

    return sendCollectionSuccess(res, {
      message: 'Заявките за осиновяване са заредени успешно.',
      items: adoptionRequestCollection.items,
      total: adoptionRequestCollection.total,
      meta: {
        filters: adoptionFilters,
        pagination: adoptionRequestCollection.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAdoptionRequest(req, res, next) {
  try {
    const adoptionRequest = await getAdoptionRequestById(req.params.requestId, req.user);

    return sendItemSuccess(res, {
      message: 'Данните за заявката са заредени успешно.',
      data: adoptionRequest,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdoptionRequestStatusEntry(req, res, next) {
  try {
    const updatedAdoptionRequest = await updateAdoptionRequestStatus(
      req.params.requestId,
      req.body,
      req.user
    );

    return sendMutationSuccess(res, {
      message: 'Статусът на заявката е обновен успешно.',
      data: updatedAdoptionRequest,
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelAdoptionRequestEntry(req, res, next) {
  try {
    const cancelledAdoptionRequest = await cancelAdoptionRequest(
      req.params.requestId,
      req.body,
      req.user
    );

    return sendMutationSuccess(res, {
      message: 'Заявката за осиновяване е отменена успешно.',
      data: cancelledAdoptionRequest,
    });
  } catch (error) {
    return next(error);
  }
}
