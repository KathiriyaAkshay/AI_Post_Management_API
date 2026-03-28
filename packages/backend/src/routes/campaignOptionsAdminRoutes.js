import { Router } from 'express';
import {
  listOptionsHandler,
  getOptionHandler,
  createOptionHandler,
  updateOptionHandler,
  deleteOptionHandler,
  reorderOptionsHandler,
  previewOptionsHandler,
} from '../controllers/campaignOptionsAdminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

router.use(authMiddleware, roleCheck(['admin']));

// GET  /admin/campaign-options?product_type_id=xxx&option_type=visual_style
router.get('/', listOptionsHandler);

// GET  /admin/campaign-options/preview?product_type_id=xxx
// Returns resolved options exactly as a customer would see them
router.get('/preview', previewOptionsHandler);

// GET  /admin/campaign-options/:id
router.get('/:id', getOptionHandler);

// POST /admin/campaign-options
router.post('/', createOptionHandler);

// PUT  /admin/campaign-options/:id
router.put('/:id', updateOptionHandler);

// DELETE /admin/campaign-options/:id
router.delete('/:id', deleteOptionHandler);

// POST /admin/campaign-options/reorder
router.post('/reorder', reorderOptionsHandler);

export default router;
