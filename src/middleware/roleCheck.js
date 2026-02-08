import { supabaseAdmin } from '../config/supabase.js';

/**
 * Middleware that restricts access to users with one of the allowed roles.
 * Must be used after authMiddleware.
 * @param {string[]} allowedRoles - e.g. ['admin']
 */
export const roleCheck = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    try {
      if (!supabaseAdmin) {
        return res.status(503).json({
          success: false,
          error: 'Admin operations not configured',
        });
      }
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res.status(403).json({
          success: false,
          error: 'Profile not found or access denied',
        });
      }

      if (!allowedRoles.includes(profile.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      req.userRole = profile.role;
      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Role check failed',
      });
    }
  };
};
