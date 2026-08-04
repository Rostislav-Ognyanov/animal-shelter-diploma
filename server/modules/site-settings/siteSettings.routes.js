import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import { getSiteSettingsEntry, updateSiteSettingsEntry } from './siteSettings.controller.js';

const router = Router();

router.get('/', getSiteSettingsEntry);
router.patch('/', permissionMiddleware('content', 'manage-settings'), updateSiteSettingsEntry);

export default router;
