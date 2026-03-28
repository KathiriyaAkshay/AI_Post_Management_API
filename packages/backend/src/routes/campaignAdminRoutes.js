import { Router } from 'express';
import {
  listPrebuiltCampaignsHandler,
  getPrebuiltCampaignHandler,
  createPrebuiltCampaignHandler,
  updatePrebuiltCampaignHandler,
  deletePrebuiltCampaignHandler,
} from '../controllers/campaignAdminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

// All routes require admin authentication
router.use(authMiddleware, roleCheck(['admin']));

router.get('/', listPrebuiltCampaignsHandler);
router.post('/', createPrebuiltCampaignHandler);
router.get('/:id', getPrebuiltCampaignHandler);
router.put('/:id', updatePrebuiltCampaignHandler);
router.delete('/:id', deletePrebuiltCampaignHandler);

export default router;
