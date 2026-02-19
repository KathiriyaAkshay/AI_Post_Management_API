import { Router } from 'express';
import {
    getProductTypesHandler,
    createProductTypeHandler,
    updateProductTypeHandler,
    deleteProductTypeHandler,
    getPromptPartsHandler,
    addPromptPartHandler,
    updatePromptPartHandler,
    deletePromptPartHandler,
    previewPromptHandler,
} from '../controllers/promptController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

// Apply auth and admin check
router.use(authMiddleware, roleCheck(['admin']));

// Product Types (per customer)
router.get('/customer/:customerId/product-types', getProductTypesHandler);
router.post('/customer/:customerId/product-types', createProductTypeHandler);

// Product Types (direct ID)
router.put('/product-types/:id', updateProductTypeHandler);
router.delete('/product-types/:id', deleteProductTypeHandler);

// Prompt Parts (per product type)
router.get('/product-types/:productTypeId/parts', getPromptPartsHandler);
router.post('/product-types/:productTypeId/parts', addPromptPartHandler);
router.get('/product-types/:productTypeId/preview', previewPromptHandler);

// Prompt Parts (direct ID)
router.put('/parts/:id', updatePromptPartHandler);
router.delete('/parts/:id', deletePromptPartHandler);

export default router;
