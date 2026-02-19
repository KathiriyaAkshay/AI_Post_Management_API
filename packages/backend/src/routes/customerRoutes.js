import { Router } from 'express';
import {
    createCustomerHandler,
    getCustomersHandler,
    getCustomerHandler,
    updateCustomerHandler,
    deleteCustomerHandler,
} from '../controllers/customerController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';
import {
    createCustomerValidator,
    handleValidation,
} from '../validators/customerValidators.js';

const router = Router();

// Apply auth and admin check to all routes
router.use(authMiddleware, roleCheck(['admin']));

router.post(
    '/',
    createCustomerValidator,
    handleValidation,
    createCustomerHandler
);

router.get('/', getCustomersHandler);
router.get('/:id', getCustomerHandler);
router.put('/:id', updateCustomerHandler);
router.delete('/:id', deleteCustomerHandler);

export default router;
