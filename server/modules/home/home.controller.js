import { sendItemSuccess } from '../../utils/apiResponse.js';
import { getHomePageData } from './home.service.js';

export async function getHomePage(req, res, next) {
  try {
    const roleCandidate = req.user?.role ?? req.query.role;
    const homePageData = await getHomePageData(roleCandidate);

    return sendItemSuccess(res, {
      message: 'Началната страница е заредена успешно.',
      data: homePageData,
    });
  } catch (error) {
    return next(error);
  }
}