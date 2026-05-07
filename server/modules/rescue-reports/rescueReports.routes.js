import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createRescueReportEntry,
  getRescueReport,
  listRescueReports,
  updateRescueReportStatusEntry,
} from './rescueReports.controller.js';

const router = Router();

router.post('/', createRescueReportEntry);
router.get('/', permissionMiddleware('rescueReports', 'view-all'), listRescueReports);
router.get('/:reportId', permissionMiddleware('rescueReports', 'detail'), getRescueReport);
router.patch(
  '/:reportId/status',
  permissionMiddleware('rescueReports', 'update-status'),
  updateRescueReportStatusEntry
);

export default router;
