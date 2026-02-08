import { Router } from 'express';
import {
  adminSignupHandler,
  loginHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  updatePasswordHandler,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  adminSignupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  updatePasswordValidator,
  handleValidation,
} from '../validators/authValidators.js';

const router = Router();

router.post('/login', loginValidator, handleValidation, loginHandler);
router.post('/forgot-password', forgotPasswordValidator, handleValidation, forgotPasswordHandler);
router.post('/reset-password', resetPasswordValidator, handleValidation, resetPasswordHandler);
router.post(
  '/update-password',
  authMiddleware,
  updatePasswordValidator,
  handleValidation,
  updatePasswordHandler
);
router.post(
  '/admin/signup',
  adminSignupValidator,
  handleValidation,
  adminSignupHandler
);

export default router;
