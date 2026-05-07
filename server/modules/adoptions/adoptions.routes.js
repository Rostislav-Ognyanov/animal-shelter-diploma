import { Router } from 'express';

import { permissionMiddleware, requireAuth } from '../auth/auth.middleware.js';
import {
  cancelAdoptionRequestEntry,
  createAdoptionRequestEntry,
  getAdoptionRequest,
  listAdoptionRequests,
  listOwnAdoptionRequests,
  updateAdoptionRequestStatusEntry,
} from './adoptions.controller.js';

const router = Router();

router.post('/', permissionMiddleware('adoptions', 'create-own-request'), createAdoptionRequestEntry);
router.get('/my', permissionMiddleware('adoptions', 'list-own'), listOwnAdoptionRequests);
router.get('/', permissionMiddleware('adoptions', 'view-all'), listAdoptionRequests);
router.get('/:requestId', requireAuth, getAdoptionRequest);
router.patch(
  '/:requestId/status',
  permissionMiddleware('adoptions', 'update-status'),
  updateAdoptionRequestStatusEntry
);
router.patch(
  '/:requestId/cancel',
  permissionMiddleware('adoptions', 'cancel-own-pending'),
  cancelAdoptionRequestEntry
);

export default router;
