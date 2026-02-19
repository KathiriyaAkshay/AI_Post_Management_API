import { Router } from 'express';
import { createCustomerHandler } from '../controllers/customerController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';
import {
  createCustomerValidator,
  handleValidation,
} from '../validators/customerValidators.js';

const router = Router();

// Deprecated: Customer creation is now handled in customerRoutes.js
// router.post('/create-customer', ...);

export default router;
