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
  body('logo_position')
    .optional()
    .isIn([
      'auto',
      'top_left',
      'top_right',
      'top_center',
      'bottom_left',
      'bottom_right',
      'bottom_center',
      'center',
    ])
    .withMessage(
      'Logo position must be one of: auto, top_left, top_right, top_center, bottom_left, bottom_right, bottom_center, center'
    ),
  body('business_locations').optional().isArray().withMessage('business_locations must be an array'),
  body('business_locations.*.id').optional().isString().withMessage('Location id must be a string'),
  body('business_locations.*.label').optional().isString().isLength({ max: 120 }).withMessage('Location label max 120 characters'),
  body('business_locations.*.address').optional().isString().isLength({ max: 500 }).withMessage('Location address max 500 characters'),
  body('business_locations.*.contact_number')
    .optional()
    .isString()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Location contact number must be a valid phone number'),
  body('business_locations.*.include_by_default')
    .optional()
    .isBoolean()
    .withMessage('Location include_by_default must be boolean'),
  body('business_locations.*.is_active')
    .optional()
    .isBoolean()
    .withMessage('Location is_active must be boolean'),
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
