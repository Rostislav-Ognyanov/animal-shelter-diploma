import { Router } from 'express';

import { createRateLimiter } from '../../utils/rateLimiter.js';
import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createContactInquiryEntry,
  getContactInquiry,
  listContactInquiries,
  updateContactInquiryStatusEntry,
} from './contactInquiries.controller.js';

const router = Router();
const createContactInquiryRateLimiter = createRateLimiter({
  windowMs: 1000 * 60 * 15,
  maxAttempts: 20,
  message: 'Твърде много контактни запитвания. Изчакай няколко минути и опитай отново.',
});

router.post('/', createContactInquiryRateLimiter, createContactInquiryEntry);
router.get('/', permissionMiddleware('contactInquiries', 'view-all'), listContactInquiries);
router.get('/:inquiryId', permissionMiddleware('contactInquiries', 'detail'), getContactInquiry);
router.patch(
  '/:inquiryId/status',
  permissionMiddleware('contactInquiries', 'update-status'),
  updateContactInquiryStatusEntry
);

export default router;
