import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} from '../auth/auth.security.js';
import {
  changeCurrentUserPassword,
  createEmployeeUser,
  getAdminUserDetailsById,
  getAdminUsersCollection,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  updateManagedUser,
  updateManagedUserStatus,
} from './users.service.js';

function readUsersFilters(query = {}) {
  return {
    role: query.role,
    status: query.status,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };
}

export async function getCurrentUser(req, res, next) {
  try {
    const currentUserProfile = await getCurrentUserProfile(req.user);

    return sendItemSuccess(res, {
      message: 'Профилът е зареден успешно.',
      data: currentUserProfile,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateCurrentUserEntry(req, res, next) {
  try {
    const updatedCurrentUser = await updateCurrentUserProfile(req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Профилът е обновен успешно.',
      data: updatedCurrentUser,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateCurrentUserPasswordEntry(req, res, next) {
  try {
    const passwordChangeResult = await changeCurrentUserPassword(req.body, req.user);

    res.cookie(AUTH_COOKIE_NAME, passwordChangeResult.token, getAuthCookieOptions(false));

    return sendMutationSuccess(res, {
      message: 'Паролата е сменена успешно.',
      data: passwordChangeResult.user,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUsers(req, res, next) {
  try {
    const userFilters = readUsersFilters(req.query);
    const adminUsersCollection = await getAdminUsersCollection(userFilters);

    return sendCollectionSuccess(res, {
      message: 'Списъкът с потребители е зареден успешно.',
      items: adminUsersCollection.items,
      total: adminUsersCollection.total,
      data: {
        summary: adminUsersCollection.summary,
      },
      meta: {
        filters: adminUsersCollection.filters,
        pagination: adminUsersCollection.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUserDetails(req, res, next) {
  try {
    const adminUserDetails = await getAdminUserDetailsById(req.params.userId);

    return sendItemSuccess(res, {
      message: 'Данните за потребителя са заредени успешно.',
      data: adminUserDetails,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createEmployeeEntry(req, res, next) {
  try {
    const createdEmployee = await createEmployeeUser(req.body);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Служителят е създаден успешно.',
      data: createdEmployee,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateUserEntry(req, res, next) {
  try {
    const updatedUser = await updateManagedUser(req.params.userId, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Потребителят е обновен успешно.',
      data: updatedUser,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateUserStatusEntry(req, res, next) {
  try {
    const updatedUser = await updateManagedUserStatus(req.params.userId, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Статусът на потребителя е обновен успешно.',
      data: updatedUser,
    });
  } catch (error) {
    return next(error);
  }
}
