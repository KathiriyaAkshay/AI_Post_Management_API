import { Router } from 'express';
import {
  getImageGenerationSettingsHandler,
  putImageGenerationSettingsHandler,
  listImageProviderCredentialsHandler,
  putImageProviderCredentialHandler,
  deleteImageProviderCredentialHandler,
  listImageProviderIdsHandler,
} from '../controllers/imageGenerationAdminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = Router();

router.use(authMiddleware, roleCheck(['admin']));

router.get('/providers', listImageProviderIdsHandler);
router.get('/settings', getImageGenerationSettingsHandler);
router.put('/settings', putImageGenerationSettingsHandler);
router.get('/credentials', listImageProviderCredentialsHandler);
router.put('/credentials/:provider', putImageProviderCredentialHandler);
router.delete('/credentials/:provider', deleteImageProviderCredentialHandler);

export default router;
