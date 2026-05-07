import { Router } from 'express';

import { permissionMiddleware } from '../auth/auth.middleware.js';
import {
  createAnimalEntry,
  deactivateAnimalEntry,
  getAnimal,
  listAnimals,
  updateAnimalEntry,
  updateAnimalStatusEntry,
} from './animals.controller.js';

const router = Router();

router.get('/', listAnimals);
router.get('/:animalId', getAnimal);
router.post('/', permissionMiddleware('animals', 'create'), createAnimalEntry);
router.patch('/:animalId/deactivate', permissionMiddleware('animals', 'deactivate'), deactivateAnimalEntry);
router.patch('/:animalId/status', permissionMiddleware('animals', 'change-status'), updateAnimalStatusEntry);
router.patch('/:animalId', permissionMiddleware('animals', 'edit'), updateAnimalEntry);

export default router;
