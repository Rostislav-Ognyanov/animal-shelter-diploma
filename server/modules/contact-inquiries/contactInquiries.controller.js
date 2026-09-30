import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  createContactInquiry,
  getContactInquiryById,
  getContactInquiryCollection,
  updateContactInquiryStatus,
} from './contactInquiries.service.js';

function readContactInquiryFilters(query = {}) {
  return {
    type: query.type,
    status: query.status,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };
}

export async function createContactInquiryEntry(req, res, next) {
  try {
    const createdInquiry = await createContactInquiry(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Запитването е изпратено успешно.',
      data: createdInquiry,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listContactInquiries(req, res, next) {
  try {
    const filters = readContactInquiryFilters(req.query);
    const inquiries = await getContactInquiryCollection(req.user, filters);

    return sendCollectionSuccess(res, {
      message: 'Запитванията са заредени успешно.',
      items: inquiries.items,
      total: inquiries.total,
      meta: {
        filters,
        pagination: inquiries.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getContactInquiry(req, res, next) {
  try {
    const inquiry = await getContactInquiryById(req.params.inquiryId, req.user);

    return sendItemSuccess(res, {
      message: 'Данните за запитването са заредени успешно.',
      data: inquiry,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateContactInquiryStatusEntry(req, res, next) {
  try {
    const updatedInquiry = await updateContactInquiryStatus(req.params.inquiryId, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Запитването е обновено успешно.',
      data: updatedInquiry,
    });
  } catch (error) {
    return next(error);
  }
}
