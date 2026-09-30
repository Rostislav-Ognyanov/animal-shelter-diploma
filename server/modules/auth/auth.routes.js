import { Router } from 'express';

import {
  getAuthStatus,
  login,
  logout,
  register,
} from './auth.controller.js';
import { createAuthRateLimiter } from './auth.rateLimiter.js';

const router = Router();
const loginRateLimiter = createAuthRateLimiter({
  maxAttempts: 20,
  message: 'Твърде много опити за вход. Изчакай няколко минути и опитай отново.',
});
const registerRateLimiter = createAuthRateLimiter({
  maxAttempts: 10,
  message: 'Твърде много опити за регистрация. Изчакай няколко минути и опитай отново.',
});

router.get('/status', getAuthStatus);
router.post('/login', loginRateLimiter, login);
router.post('/register', registerRateLimiter, register);
router.post('/logout', logout);

export default router;
