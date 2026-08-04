import { sendItemSuccess, sendMutationSuccess } from '../../utils/apiResponse.js';
import { getPageContent, updatePageContent } from './pageContent.service.js';

export async function getPageContentEntry(req, res, next) {
  try {
    const pageContent = await getPageContent(req.params.pageKey);

    return sendItemSuccess(res, {
      message: 'Съдържанието на страницата е заредено успешно.',
      data: pageContent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updatePageContentEntry(req, res, next) {
  try {
    const pageContent = await updatePageContent(req.params.pageKey, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Съдържанието на страницата е обновено успешно.',
      data: pageContent,
    });
  } catch (error) {
    return next(error);
  }
}
