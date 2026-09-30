import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  getUnreadCount,
  listNotifications,
  readAllNotifications,
  readNotification,
} from './notifications.controller.js';

const router = Router();

router.get('/', permissionMiddleware('notifications', 'list-own'), listNotifications);
router.get('/unread-count', permissionMiddleware('notifications', 'list-own'), getUnreadCount);
router.patch('/read-all', permissionMiddleware('notifications', 'mark-own-read'), readAllNotifications);
router.patch('/:notificationId/read', permissionMiddleware('notifications', 'mark-own-read'), readNotification);

export default router;
