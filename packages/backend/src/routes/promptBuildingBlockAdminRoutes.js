import { Router } from 'express';
import {
  listPromptBlocksHandler,
  resolvedPromptBlocksHandler,
  getPromptBlockHandler,
  createPromptBlockHandler,
  updatePromptBlockHandler,
  deletePromptBlockHandler,
} from '../controllers/promptBuildingBlockAdminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

router.use(authMiddleware, roleCheck(['admin']));

// GET /admin/prompt-blocks/resolved — must be before /:id
router.get('/resolved', resolvedPromptBlocksHandler);

router.get('/', listPromptBlocksHandler);
router.post('/', createPromptBlockHandler);
router.get('/:id', getPromptBlockHandler);
router.put('/:id', updatePromptBlockHandler);
router.delete('/:id', deletePromptBlockHandler);

export default router;
