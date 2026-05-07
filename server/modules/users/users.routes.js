import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createEmployeeEntry,
  getCurrentUser,
  getUserDetails,
  getUsers,
  updateCurrentUserEntry,
  updateCurrentUserPasswordEntry,
  updateUserEntry,
  updateUserStatusEntry,
} from './users.controller.js';

const router = Router();

router.get('/me', permissionMiddleware('profile', 'view-own'), getCurrentUser);
router.patch('/me', permissionMiddleware('profile', 'edit-own'), updateCurrentUserEntry);
router.patch(
  '/me/password',
  permissionMiddleware('profile', 'change-own-password'),
  updateCurrentUserPasswordEntry
);

router.get('/', permissionMiddleware('users', 'list'), getUsers);
router.post('/employees', permissionMiddleware('users', 'create-employee'), createEmployeeEntry);
router.get('/:userId', permissionMiddleware('users', 'detail'), getUserDetails);
router.patch('/:userId', permissionMiddleware('users', 'manage-roles'), updateUserEntry);
router.patch(
  '/:userId/status',
  permissionMiddleware('users', 'manage-sensitive-access'),
  updateUserStatusEntry
);

export default router;
