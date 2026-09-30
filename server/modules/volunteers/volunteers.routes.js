import { Router } from 'express';

import { createRateLimiter } from '../../utils/rateLimiter.js';
import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createVolunteerApplicationEntry,
  getVolunteerApplication,
  listVolunteerApplications,
  updateVolunteerApplicationReviewEntry,
} from './volunteers.controller.js';

const router = Router();
const createVolunteerApplicationRateLimiter = createRateLimiter({
  windowMs: 1000 * 60 * 15,
  maxAttempts: 15,
  message:
    'Твърде много доброволчески кандидатури. Изчакай няколко минути и опитай отново.',
});

router.post('/', createVolunteerApplicationRateLimiter, createVolunteerApplicationEntry);
router.get('/', permissionMiddleware('volunteers', 'view-all'), listVolunteerApplications);
router.get('/:applicationId', permissionMiddleware('volunteers', 'detail'), getVolunteerApplication);
router.patch(
  '/:applicationId/review',
  permissionMiddleware('volunteers', 'review'),
  updateVolunteerApplicationReviewEntry
);

export default router;
