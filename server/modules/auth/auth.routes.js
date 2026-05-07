import { Router } from 'express';

import {
  getAuthStatus,
  login,
  logout,
  register,
} from './auth.controller.js';

const router = Router();

router.get('/status', getAuthStatus);
router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);

export default router;
