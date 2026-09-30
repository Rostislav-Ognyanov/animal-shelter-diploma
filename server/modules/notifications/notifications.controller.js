import {
  sendCollectionSuccess,
  sendItemSuccess,
  sendMutationSuccess,
} from '../../utils/apiResponse.js';
import {
  getNotificationCollection,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notifications.service.js';

function readNotificationFilters(query = {}) {
  return {
    page: query.page,
    limit: query.limit,
  };
}

export async function listNotifications(req, res, next) {
  try {
    const notificationFilters = readNotificationFilters(req.query);
    const notifications = await getNotificationCollection(req.user, notificationFilters);

    return sendCollectionSuccess(res, {
      message: 'Известията са заредени успешно.',
      items: notifications.items,
      total: notifications.total,
      meta: {
        pagination: notifications.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const unreadCount = await getUnreadNotificationCount(req.user);

    return sendItemSuccess(res, {
      message: 'Броят непрочетени известия е зареден успешно.',
      data: unreadCount,
    });
  } catch (error) {
    return next(error);
  }
}

export async function readNotification(req, res, next) {
  try {
    const notification = await markNotificationAsRead(req.params.notificationId, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Известието е отбелязано като прочетено.',
      data: notification,
    });
  } catch (error) {
    return next(error);
  }
}

export async function readAllNotifications(req, res, next) {
  try {
    const result = await markAllNotificationsAsRead(req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Всички известия са отбелязани като прочетени.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
