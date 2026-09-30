import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  createRescueReport,
  getRescueReportById,
  getRescueReportCollection,
  updateRescueReportReview,
} from './rescueReports.service.js';

function readRescueReportFilters(query = {}) {
  return {
    status: query.status,
    urgency: query.urgency,
    species: query.species,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };
}

export async function createRescueReportEntry(req, res, next) {
  try {
    const createdReport = await createRescueReport(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Сигналът е изпратен успешно.',
      data: createdReport,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listRescueReports(req, res, next) {
  try {
    const filters = readRescueReportFilters(req.query);
    const reports = await getRescueReportCollection(req.user, filters);

    return sendCollectionSuccess(res, {
      message: 'Сигналите са заредени успешно.',
      items: reports.items,
      total: reports.total,
      meta: {
        filters,
        pagination: reports.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getRescueReport(req, res, next) {
  try {
    const report = await getRescueReportById(req.params.reportId, req.user);

    return sendItemSuccess(res, {
      message: 'Данните за сигнала са заредени успешно.',
      data: report,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateRescueReportReviewEntry(req, res, next) {
  try {
    const updatedReport = await updateRescueReportReview(req.params.reportId, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Сигналът е обновен успешно.',
      data: updatedReport,
    });
  } catch (error) {
    return next(error);
  }
}
