import { Router } from 'express';
import {
  listAdminFeedbackHandler,
  getAdminFeedbackHandler,
  updateAdminFeedbackHandler,
  deleteAdminFeedbackHandler,
} from '../controllers/feedbackController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

router.use(authMiddleware, roleCheck(['admin']));

router.get('/', listAdminFeedbackHandler);
router.get('/:id', getAdminFeedbackHandler);
router.put('/:id', updateAdminFeedbackHandler);
router.delete('/:id', deleteAdminFeedbackHandler);

export default router;
