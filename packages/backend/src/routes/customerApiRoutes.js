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
import {
  createCustomerFeedbackHandler,
  listCustomerFeedbackHandler,
  getCustomerFeedbackHandler,
  updateCustomerFeedbackHandler,
  deleteCustomerFeedbackHandler,
} from '../controllers/feedbackController.js';
import {
  upsertUserDeviceHandler,
  listUserDevicesHandler,
  getUserDeviceHandler,
  updateUserDeviceHandler,
  deleteUserDeviceHandler,
} from '../controllers/userDeviceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';
import {
  upsertUserDeviceValidator,
  updateUserDeviceValidator,
  deviceIdParamValidator,
  handleValidation,
} from '../validators/userDeviceValidators.js';

const router = Router();

// All routes require customer or admin authentication (admin can access for testing/preview)
router.use(authMiddleware, roleCheck(['customer', 'admin']));

// Profile
router.get('/profile', getProfileHandler);
router.put('/profile', updateProfileHandler);

router.get('/feedback', listCustomerFeedbackHandler);
router.post('/feedback', createCustomerFeedbackHandler);
router.get('/feedback/:id', getCustomerFeedbackHandler);
router.put('/feedback/:id', updateCustomerFeedbackHandler);
router.delete('/feedback/:id', deleteCustomerFeedbackHandler);

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

// Devices
router.post('/devices', upsertUserDeviceValidator, handleValidation, upsertUserDeviceHandler);
router.get('/devices', listUserDevicesHandler);
router.get('/devices/:deviceId', deviceIdParamValidator, handleValidation, getUserDeviceHandler);
router.put('/devices/:deviceId', updateUserDeviceValidator, handleValidation, updateUserDeviceHandler);
router.delete('/devices/:deviceId', deviceIdParamValidator, handleValidation, deleteUserDeviceHandler);

export default router;
