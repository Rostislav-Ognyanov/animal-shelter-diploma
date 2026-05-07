import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import { createDonationEntry, getDonation, listDonations } from './donations.controller.js';

const router = Router();

router.post('/', createDonationEntry);
router.get('/', permissionMiddleware('donations', 'view-all'), listDonations);
router.get('/:donationId', permissionMiddleware('donations', 'detail'), getDonation);

export default router;
