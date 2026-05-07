import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createVolunteerApplicationEntry,
  getVolunteerApplication,
  listVolunteerApplications,
  updateVolunteerApplicationStatusEntry,
} from './volunteers.controller.js';

const router = Router();

router.post('/', createVolunteerApplicationEntry);
router.get('/', permissionMiddleware('volunteers', 'view-all'), listVolunteerApplications);
router.get('/:applicationId', permissionMiddleware('volunteers', 'detail'), getVolunteerApplication);
router.patch(
  '/:applicationId/status',
  permissionMiddleware('volunteers', 'update-status'),
  updateVolunteerApplicationStatusEntry
);

export default router;
