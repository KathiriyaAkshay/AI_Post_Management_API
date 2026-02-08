import { Router } from 'express';
import { createCustomerHandler } from '../controllers/customerController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';
import {
  createCustomerValidator,
  handleValidation,
} from '../validators/customerValidators.js';

const router = Router();

router.post(
  '/create-customer',
  authMiddleware,
  roleCheck(['admin']),
  createCustomerValidator,
  handleValidation,
  createCustomerHandler
);

export default router;
