import { sendCollectionSuccess, sendItemSuccess, sendMutationSuccess } from '../../utils/apiResponse.js';
import {
  archiveSpeciesContent,
  getPublishedSpeciesContent,
  getSpeciesContentDraft,
  listPublishedSpeciesContent,
  listSpeciesContentDrafts,
  publishSpeciesContentDraft,
  updateSpeciesContentDraft,
} from './speciesContent.service.js';

export async function listPublishedSpeciesContentEntry(req, res, next) {
  try {
    const speciesItems = await listPublishedSpeciesContent();

    return sendCollectionSuccess(res, {
      message: 'Информацията за видовете е заредена успешно.',
      items: speciesItems,
      total: speciesItems.length,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPublishedSpeciesContentEntry(req, res, next) {
  try {
    const speciesContent = await getPublishedSpeciesContent(req.params.species);

    return sendItemSuccess(res, {
      message: 'Информацията за вида е заредена успешно.',
      data: speciesContent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listSpeciesContentDraftsEntry(req, res, next) {
  try {
    const speciesItems = await listSpeciesContentDrafts(req.user);

    return sendCollectionSuccess(res, {
      message: 'Черновите за видовете са заредени успешно.',
      items: speciesItems,
      total: speciesItems.length,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSpeciesContentDraftEntry(req, res, next) {
  try {
    const speciesContent = await getSpeciesContentDraft(req.params.species, req.user);

    return sendItemSuccess(res, {
      message: 'Черновата за вида е заредена успешно.',
      data: speciesContent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSpeciesContentDraftEntry(req, res, next) {
  try {
    const speciesContent = await updateSpeciesContentDraft(req.params.species, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Черновата за вида е обновена успешно.',
      data: speciesContent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function publishSpeciesContentDraftEntry(req, res, next) {
  try {
    const speciesContent = await publishSpeciesContentDraft(req.params.species, req.user);

    return sendMutationSuccess(res, {
      message: 'Информацията за вида е публикувана успешно.',
      data: speciesContent,
    });
  } catch (error) {
    return next(error);
  }
}

export async function archiveSpeciesContentEntry(req, res, next) {
  try {
    const speciesContent = await archiveSpeciesContent(req.params.species, req.user);

    return sendMutationSuccess(res, {
      message: 'Публичната информация за вида е скрита успешно.',
      data: speciesContent,
    });
  } catch (error) {
    return next(error);
  }
}
