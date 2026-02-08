import { body, validationResult } from 'express-validator';

export const createCustomerValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters, alphanumeric and underscores only'),
  body('business_name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Business name is required (max 255 characters)'),
  body('logo').optional().isURL().withMessage('Logo must be a valid URL'),
  body('contact_number')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Contact number must be a valid phone number'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address max 500 characters'),
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
