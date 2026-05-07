import { Router } from 'express';

import { roleMiddleware } from '../auth/auth.middleware.js';
import { getAnimalMasterData, getReportsOverview } from './reports.controller.js';

const router = Router();

router.use(roleMiddleware('admin'));
router.get('/overview', getReportsOverview);
router.get('/animal-master-data', getAnimalMasterData);

export default router;
