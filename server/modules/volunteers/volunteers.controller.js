import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  createVolunteerApplication,
  getVolunteerApplicationById,
  getVolunteerApplicationCollection,
  getVolunteerApplicationModulePolicy,
  updateVolunteerApplicationStatus,
} from './volunteers.service.js';

function readVolunteerApplicationFilters(query = {}) {
  return {
    status: query.status,
    search: query.search,
  };
}

function buildVolunteerApplicationResponseData(application, roleCandidate) {
  return {
    ...application,
    policy: getVolunteerApplicationModulePolicy(roleCandidate),
  };
}

export async function createVolunteerApplicationEntry(req, res, next) {
  try {
    const createdApplication = await createVolunteerApplication(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Кандидатурата за доброволец е изпратена успешно.',
      data: buildVolunteerApplicationResponseData(createdApplication, req.user?.role),
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
      items: applications,
      total: applications.length,
      data: {
        policy: getVolunteerApplicationModulePolicy(req.user?.role),
      },
      meta: {
        filters,
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
      data: buildVolunteerApplicationResponseData(application, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateVolunteerApplicationStatusEntry(req, res, next) {
  try {
    const updatedApplication = await updateVolunteerApplicationStatus(
      req.params.applicationId,
      req.body,
      req.user
    );

    return sendMutationSuccess(res, {
      message: 'Кандидатурата е обновена успешно.',
      data: buildVolunteerApplicationResponseData(updatedApplication, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}
