import { Router } from 'express';

import { createRateLimiter } from '../../utils/rateLimiter.js';
import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createDonationEntry,
  getDonation,
  listDonations,
  updateDonationStatusEntry,
} from './donations.controller.js';

const router = Router();
const createDonationRateLimiter = createRateLimiter({
  windowMs: 1000 * 60 * 15,
  maxAttempts: 15,
  message:
    'Твърде много заявки за дарение. Изчакай няколко минути и опитай отново.',
});

router.post('/', createDonationRateLimiter, createDonationEntry);
router.get('/', permissionMiddleware('donations', 'view-all'), listDonations);
router.get('/:donationId', permissionMiddleware('donations', 'detail'), getDonation);
router.patch('/:donationId/status', permissionMiddleware('donations', 'update-status'), updateDonationStatusEntry);

export default router;
