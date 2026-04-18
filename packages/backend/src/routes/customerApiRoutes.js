import { Router } from 'express';
import {
  getProfileHandler,
  updateProfileHandler,
  getDashboardHandler,
  listCampaignsHandler,
  getCampaignHandler,
  createCampaignHandler,
  updateCampaignHandler,
  deleteCampaignHandler,
  cloneCampaignHandler,
  generateImageHandler,
  getGenerationJobHandler,
  listAssetsHandler,
  getAssetHandler,
  patchAssetHandler,
  getProductTypesHandler,
  getCampaignOptionsHandler,
} from '../controllers/customerApiController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

// All routes require customer or admin authentication (admin can access for testing/preview)
router.use(authMiddleware, roleCheck(['customer', 'admin']));

// Profile
router.get('/profile', getProfileHandler);
router.put('/profile', updateProfileHandler);

// Dashboard
router.get('/dashboard', getDashboardHandler);

// Product types (read-only view of admin-configured types)
router.get('/product-types', getProductTypesHandler);

// Campaign config options (resolved for a product type, falls back to global defaults)
// GET /api/customer/campaign-options?product_type_id=<uuid>
router.get('/campaign-options', getCampaignOptionsHandler);

// Campaigns
router.get('/campaigns', listCampaignsHandler);
router.post('/campaigns', createCampaignHandler);
router.get('/campaigns/:id', getCampaignHandler);
router.put('/campaigns/:id', updateCampaignHandler);
router.delete('/campaigns/:id', deleteCampaignHandler);
router.post('/campaigns/:id/clone', cloneCampaignHandler);

// Image generation
router.post('/generate', generateImageHandler);
router.get('/generation-jobs/:jobId', getGenerationJobHandler);

// Assets
router.get('/assets', listAssetsHandler);
router.patch('/assets/:id', patchAssetHandler);
router.get('/assets/:id', getAssetHandler);

export default router;
