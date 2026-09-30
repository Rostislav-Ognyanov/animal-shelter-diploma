import { Router } from 'express';

import { createRateLimiter } from '../../utils/rateLimiter.js';
import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createRescueReportEntry,
  getRescueReport,
  listRescueReports,
  updateRescueReportReviewEntry,
} from './rescueReports.controller.js';

const router = Router();
const createRescueReportRateLimiter = createRateLimiter({
  windowMs: 1000 * 60 * 15,
  maxAttempts: 15,
  message: 'Твърде много сигнали. Изчакай няколко минути и опитай отново.',
});

router.post('/', createRescueReportRateLimiter, createRescueReportEntry);
router.get('/', permissionMiddleware('rescueReports', 'view-all'), listRescueReports);
router.get('/:reportId', permissionMiddleware('rescueReports', 'detail'), getRescueReport);
router.patch(
  '/:reportId/review',
  permissionMiddleware('rescueReports', 'review'),
  updateRescueReportReviewEntry
);

export default router;
