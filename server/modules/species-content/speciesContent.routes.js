import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  archiveSpeciesContentEntry,
  getPublishedSpeciesContentEntry,
  getSpeciesContentDraftEntry,
  listPublishedSpeciesContentEntry,
  listSpeciesContentDraftsEntry,
  publishSpeciesContentDraftEntry,
  updateSpeciesContentDraftEntry,
} from './speciesContent.controller.js';

const router = Router();

router.get('/', listPublishedSpeciesContentEntry);
router.get('/drafts', permissionMiddleware('speciesContent', 'view-draft'), listSpeciesContentDraftsEntry);
router.get(
  '/drafts/:species',
  permissionMiddleware('speciesContent', 'view-draft'),
  getSpeciesContentDraftEntry
);
router.patch(
  '/drafts/:species',
  permissionMiddleware('speciesContent', 'update'),
  updateSpeciesContentDraftEntry
);
router.patch(
  '/drafts/:species/publish',
  permissionMiddleware('speciesContent', 'publish'),
  publishSpeciesContentDraftEntry
);
router.patch(
  '/drafts/:species/archive',
  permissionMiddleware('speciesContent', 'archive'),
  archiveSpeciesContentEntry
);
router.get('/:species', getPublishedSpeciesContentEntry);

export default router;
