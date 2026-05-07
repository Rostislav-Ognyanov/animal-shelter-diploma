import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  createRescueReport,
  getRescueReportById,
  getRescueReportCollection,
  getRescueReportModulePolicy,
  updateRescueReportStatus,
} from './rescueReports.service.js';

function readRescueReportFilters(query = {}) {
  return {
    status: query.status,
    search: query.search,
  };
}

function buildRescueReportResponseData(report, roleCandidate) {
  return {
    ...report,
    policy: getRescueReportModulePolicy(roleCandidate),
  };
}

export async function createRescueReportEntry(req, res, next) {
  try {
    const createdReport = await createRescueReport(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Сигналът е изпратен успешно.',
      data: buildRescueReportResponseData(createdReport, req.user?.role),
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
      items: reports,
      total: reports.length,
      data: {
        policy: getRescueReportModulePolicy(req.user?.role),
      },
      meta: {
        filters,
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
      data: buildRescueReportResponseData(report, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateRescueReportStatusEntry(req, res, next) {
  try {
    const updatedReport = await updateRescueReportStatus(req.params.reportId, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Сигналът е обновен успешно.',
      data: buildRescueReportResponseData(updatedReport, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}
