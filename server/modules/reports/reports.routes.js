import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import { getAnimalMasterData, getReportsOverview } from './reports.controller.js';

const router = Router();

router.use(permissionMiddleware('reports', 'view-operational'));
router.get('/overview', getReportsOverview);
router.get('/animal-master-data', getAnimalMasterData);

export default router;
