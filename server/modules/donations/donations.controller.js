import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  createDonation,
  getDonationById,
  getDonationCollection,
  getDonationModulePolicy,
} from './donations.service.js';

function readDonationFilters(query = {}) {
  return {
    search: query.search,
  };
}

function buildDonationResponseData(donation, roleCandidate) {
  return {
    ...donation,
    policy: getDonationModulePolicy(roleCandidate),
  };
}

export async function createDonationEntry(req, res, next) {
  try {
    const createdDonation = await createDonation(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Демонстрационното дарение е записано успешно.',
      data: buildDonationResponseData(createdDonation, req.user?.role),
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
      items: donations,
      total: donations.length,
      data: {
        policy: getDonationModulePolicy(req.user?.role),
      },
      meta: {
        filters,
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
      message: 'Детайлите за дарението са заредени успешно.',
      data: buildDonationResponseData(donation, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}
