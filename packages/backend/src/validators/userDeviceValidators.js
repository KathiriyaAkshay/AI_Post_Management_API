import { body, param, validationResult } from 'express-validator';

const allowedPlatforms = ['ios', 'android', 'web'];

export const upsertUserDeviceValidator = [
  body('device_id').trim().notEmpty().withMessage('device_id is required'),
  body('token').trim().notEmpty().withMessage('token is required'),
  body('platform')
    .optional({ nullable: true })
    .isIn(allowedPlatforms)
    .withMessage('platform must be one of: ios, android, web'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  body('last_seen_at').optional().isISO8601().withMessage('last_seen_at must be a valid ISO 8601 date'),
];

export const updateUserDeviceValidator = [
  param('deviceId').trim().notEmpty().withMessage('deviceId is required'),
  body('token').optional().trim().notEmpty().withMessage('token cannot be empty'),
  body('platform')
    .optional({ nullable: true })
    .isIn(allowedPlatforms)
    .withMessage('platform must be one of: ios, android, web'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  body('last_seen_at').optional().isISO8601().withMessage('last_seen_at must be a valid ISO 8601 date'),
];

export const deviceIdParamValidator = [
  param('deviceId').trim().notEmpty().withMessage('deviceId is required'),
];

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors
        .array()
        .map((e) => e.msg)
        .join('; '),
    });
  }
  next();
}
