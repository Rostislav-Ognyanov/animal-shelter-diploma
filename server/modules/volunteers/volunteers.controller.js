import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  createVolunteerApplication,
  getVolunteerApplicationById,
  getVolunteerApplicationCollection,
  updateVolunteerApplicationReview,
} from './volunteers.service.js';

function readVolunteerApplicationFilters(query = {}) {
  return {
    status: query.status,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };
}

export async function createVolunteerApplicationEntry(req, res, next) {
  try {
    const createdApplication = await createVolunteerApplication(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Кандидатурата за доброволец е изпратена успешно.',
      data: createdApplication,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listVolunteerApplications(req, res, next) {
  try {
    const filters = readVolunteerApplicationFilters(req.query);
    const applications = await getVolunteerApplicationCollection(req.user, filters);

    return sendCollectionSuccess(res, {
      message: 'Кандидатурите за доброволци са заредени успешно.',
      items: applications.items,
      total: applications.total,
      meta: {
        filters,
        pagination: applications.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getVolunteerApplication(req, res, next) {
  try {
    const application = await getVolunteerApplicationById(req.params.applicationId, req.user);

    return sendItemSuccess(res, {
      message: 'Данните за кандидатурата са заредени успешно.',
      data: application,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateVolunteerApplicationReviewEntry(req, res, next) {
  try {
    const updatedApplication = await updateVolunteerApplicationReview(
      req.params.applicationId,
      req.body,
      req.user
    );

    return sendMutationSuccess(res, {
      message: 'Кандидатурата е обновена успешно.',
      data: updatedApplication,
    });
  } catch (error) {
    return next(error);
  }
}
