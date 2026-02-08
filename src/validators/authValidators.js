import { body, validationResult } from 'express-validator';

export const loginValidator = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

export const resetPasswordValidator = [
  body('access_token').notEmpty().withMessage('Access token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const updatePasswordValidator = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const adminSignupValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('full_name').optional().trim().isString(),
];

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array().map((e) => e.msg).join('; '),
    });
  }
  next();
}
