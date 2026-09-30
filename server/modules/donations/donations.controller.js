import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  canUpdateDonationStatus,
  createDonation,
  getDonationById,
  getDonationCollection,
  updateDonationStatus,
} from './donations.service.js';

function readDonationFilters(query = {}) {
  return {
    search: query.search,
    status: query.status,
    page: query.page,
    limit: query.limit,
  };
}

function buildDonationDetailResponseData(donation, roleCandidate) {
  return {
    ...donation,
    canUpdateStatus: canUpdateDonationStatus(roleCandidate),
  };
}

export async function createDonationEntry(req, res, next) {
  try {
    const createdDonation = await createDonation(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Заявката за дарение е записана успешно.',
      data: createdDonation,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listDonations(req, res, next) {
  try {
    const filters = readDonationFilters(req.query);
    const donations = await getDonationCollection(req.user, filters);

    return sendCollectionSuccess(res, {
      message: 'Даренията са заредени успешно.',
      items: donations.items,
      total: donations.total,
      meta: {
        filters,
        pagination: donations.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDonation(req, res, next) {
  try {
    const donation = await getDonationById(req.params.donationId, req.user);

    return sendItemSuccess(res, {
      message: 'Детайлите за заявката за дарение са заредени успешно.',
      data: buildDonationDetailResponseData(donation, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateDonationStatusEntry(req, res, next) {
  try {
    const donation = await updateDonationStatus(req.params.donationId, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Статусът на заявката за дарение е обновен успешно.',
      data: buildDonationDetailResponseData(donation, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}
