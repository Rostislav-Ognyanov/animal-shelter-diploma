import { sendItemSuccess, sendMutationSuccess } from '../../utils/apiResponse.js';
import { getSiteSettings, updateSiteSettings } from './siteSettings.service.js';

export async function getSiteSettingsEntry(req, res, next) {
  try {
    const settings = await getSiteSettings();

    return sendItemSuccess(res, {
      message: 'Настройките на сайта са заредени успешно.',
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSiteSettingsEntry(req, res, next) {
  try {
    const settings = await updateSiteSettings(req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Настройките на сайта са обновени успешно.',
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
}
