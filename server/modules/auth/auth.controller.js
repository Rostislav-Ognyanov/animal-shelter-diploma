import { sendItemSuccess, sendMutationSuccess } from '../../utils/apiResponse.js';
import {
  getAuthStatusPayload,
  getLogoutPayload,
  loginUser,
  registerUser,
} from './auth.service.js';
import {
  AUTH_COOKIE_NAME,
  getAuthCookieClearOptions,
  getAuthCookieOptions,
} from './auth.security.js';

function setAuthCookie(res, token, rememberMe) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(rememberMe));
}

function buildAuthStatusNotice(req) {
  if (req.authFailureReason === 'inactive') {
    return 'Профилът ти е деактивиран. Свържи се с администратор, ако смяташ, че това е грешка.';
  }

  if (req.authFailureReason === 'invalid') {
    return 'Сесията ти е невалидна или е изтекла. Влез отново, за да продължиш.';
  }

  return '';
}

function buildAuthResponseData(authPayload, accessToken = '', authNotice = '') {
  return {
    ...authPayload,
    accessToken,
    authNotice,
  };
}

export async function getAuthStatus(req, res, next) {
  try {
    const authNotice = buildAuthStatusNotice(req);

    return sendItemSuccess(res, {
      message: authNotice || 'Статусът на текущата сесия е зареден.',
      data: buildAuthResponseData(getAuthStatusPayload(req.user), req.authToken, authNotice),
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    if (req.user) {
      return sendMutationSuccess(res, {
        status: 200,
        message: 'Вече има активна сесия за текущия браузър.',
        data: buildAuthResponseData(getAuthStatusPayload(req.user), req.authToken),
      });
    }

    const authResult = await loginUser(req.body);
    setAuthCookie(res, authResult.token, authResult.rememberMe);

    return sendMutationSuccess(res, {
      message: authResult.message,
      data: buildAuthResponseData(authResult.data, authResult.token),
    });
  } catch (error) {
    return next(error);
  }
}

export async function register(req, res, next) {
  try {
    if (req.user) {
      return sendMutationSuccess(res, {
        status: 200,
        message: 'Вече има активна сесия за текущия браузър.',
        data: buildAuthResponseData(getAuthStatusPayload(req.user), req.authToken),
      });
    }

    const authResult = await registerUser(req.body);
    setAuthCookie(res, authResult.token, authResult.rememberMe);

    return sendMutationSuccess(res, {
      status: 201,
      message: authResult.message,
      data: buildAuthResponseData(authResult.data, authResult.token),
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieClearOptions());

    return sendMutationSuccess(res, {
      message: 'Изходът е успешен.',
      data: buildAuthResponseData(getLogoutPayload(), ''),
    });
  } catch (error) {
    return next(error);
  }
}
