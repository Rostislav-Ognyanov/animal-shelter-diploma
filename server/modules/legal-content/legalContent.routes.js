import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  getLegalContentDraftEntry,
  getPublishedLegalContentEntry,
  listLegalContentDraftsEntry,
  publishLegalContentDraftEntry,
  updateLegalContentDraftEntry,
} from './legalContent.controller.js';

const router = Router();

router.get('/admin/records', permissionMiddleware('content', 'manage-legal'), listLegalContentDraftsEntry);
router.get('/admin/:legalKey', permissionMiddleware('content', 'manage-legal'), getLegalContentDraftEntry);
router.patch('/admin/:legalKey', permissionMiddleware('content', 'manage-legal'), updateLegalContentDraftEntry);
router.patch(
  '/admin/:legalKey/publish',
  permissionMiddleware('content', 'manage-legal'),
  publishLegalContentDraftEntry
);
router.get('/:legalKey', getPublishedLegalContentEntry);

export default router;
