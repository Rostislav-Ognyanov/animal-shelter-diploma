import { sendMutationSuccess } from '../../utils/apiResponse.js';
import { createContactInquiry } from './contactInquiries.service.js';

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
