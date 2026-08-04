import { sendCollectionSuccess, sendItemSuccess, sendMutationSuccess } from '../../utils/apiResponse.js';
import {
  getLegalContentDraft,
  getPublishedLegalContent,
  listLegalContentDrafts,
  publishLegalContentDraft,
  updateLegalContentDraft,
} from './legalContent.service.js';

export async function getPublishedLegalContentEntry(req, res, next) {
  try {
    const legalContent = await getPublishedLegalContent(req.params.legalKey);

    return sendItemSuccess(res, {
      message: 'Юридическото съдържание е заредено успешно.',
      data: legalContent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listLegalContentDraftsEntry(req, res, next) {
  try {
    const records = await listLegalContentDrafts(req.user);

    return sendCollectionSuccess(res, {
      message: 'Юридическите страници са заредени успешно.',
      items: records,
      total: records.length,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getLegalContentDraftEntry(req, res, next) {
  try {
    const legalContent = await getLegalContentDraft(req.params.legalKey, req.user);

    return sendItemSuccess(res, {
      message: 'Черновата е заредена успешно.',
      data: legalContent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateLegalContentDraftEntry(req, res, next) {
  try {
    const legalContent = await updateLegalContentDraft(req.params.legalKey, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Черновата е запазена успешно.',
      data: legalContent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function publishLegalContentDraftEntry(req, res, next) {
  try {
    const legalContent = await publishLegalContentDraft(req.params.legalKey, req.user);

    return sendMutationSuccess(res, {
      message: 'Юридическата страница е публикувана успешно.',
      data: legalContent,
    });
  } catch (error) {
    return next(error);
  }
}
