import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  changeCurrentUserPassword,
  createEmployeeUser,
  getAdminUserDetailsById,
  getAdminUsersCollection,
  getCurrentUserProfile,
  getUsersModulePolicy,
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

function buildUserResponseData(user, roleCandidate) {
  return {
    ...user,
    policy: getUsersModulePolicy(roleCandidate),
  };
}

export async function getCurrentUser(req, res, next) {
  try {
    const currentUserProfile = await getCurrentUserProfile(req.user);

    return sendItemSuccess(res, {
      message: 'Профилът е зареден успешно.',
      data: buildUserResponseData(currentUserProfile, req.user?.role),
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
      data: buildUserResponseData(updatedCurrentUser, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateCurrentUserPasswordEntry(req, res, next) {
  try {
    const updatedCurrentUser = await changeCurrentUserPassword(req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Паролата е сменена успешно.',
      data: buildUserResponseData(updatedCurrentUser, req.user?.role),
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
        policy: getUsersModulePolicy(req.user?.role),
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
      data: buildUserResponseData(adminUserDetails, req.user?.role),
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
      data: buildUserResponseData(createdEmployee, req.user?.role),
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
      data: buildUserResponseData(updatedUser, req.user?.role),
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
      data: buildUserResponseData(updatedUser, req.user?.role),
    });
  } catch (error) {
    return next(error);
  }
}
