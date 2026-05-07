import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createFavoriteEntry,
  deleteFavoriteEntry,
  listOwnFavorites,
} from './favorites.controller.js';

const router = Router();

router.get('/', permissionMiddleware('favorites', 'list-own'), listOwnFavorites);
router.post('/:animalId', permissionMiddleware('favorites', 'create-own'), createFavoriteEntry);
router.delete('/:animalId', permissionMiddleware('favorites', 'remove-own'), deleteFavoriteEntry);

export default router;
