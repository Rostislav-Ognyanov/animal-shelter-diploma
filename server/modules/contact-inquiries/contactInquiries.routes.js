import { Router } from 'express';

import { createContactInquiryEntry } from './contactInquiries.controller.js';

const router = Router();

router.post('/', createContactInquiryEntry);

export default router;
