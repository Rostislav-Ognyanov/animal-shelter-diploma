import { sendItemSuccess } from '../../utils/apiResponse.js';
import { getAnimalMasterDataReport, getReportsOverviewData } from './reports.service.js';

export async function getReportsOverview(req, res, next) {
  try {
    const overview = await getReportsOverviewData(req.query);

    return sendItemSuccess(res, {
      message: 'Отчетният обзор е зареден успешно.',
      data: overview,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAnimalMasterData(req, res, next) {
  try {
    const animalMasterData = await getAnimalMasterDataReport(req.query);

    return sendItemSuccess(res, {
      message: 'Главните данни за животни са заредени успешно.',
      data: animalMasterData,
    });
  } catch (error) {
    return next(error);
  }
}
