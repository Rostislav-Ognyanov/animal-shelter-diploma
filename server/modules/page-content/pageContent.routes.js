import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import { getPageContentEntry, updatePageContentEntry } from './pageContent.controller.js';

const router = Router();

router.get('/:pageKey', getPageContentEntry);
router.patch('/:pageKey', permissionMiddleware('content', 'update'), updatePageContentEntry);

export default router;
