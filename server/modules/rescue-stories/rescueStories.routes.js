import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  archiveRescueStoryEntry,
  createRescueStoryEntry,
  listPublishedRescueStoriesEntry,
  listRescueStoryRecordsEntry,
  updateRescueStoryEntry,
} from './rescueStories.controller.js';

const router = Router();

router.get('/', listPublishedRescueStoriesEntry);
router.get('/records', permissionMiddleware('rescueStories', 'view-all'), listRescueStoryRecordsEntry);
router.post('/', permissionMiddleware('rescueStories', 'create'), createRescueStoryEntry);
router.patch('/:storyId', permissionMiddleware('rescueStories', 'update'), updateRescueStoryEntry);
router.patch('/:storyId/archive', permissionMiddleware('rescueStories', 'archive'), archiveRescueStoryEntry);

export default router;
