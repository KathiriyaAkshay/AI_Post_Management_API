import { createClient } from '@supabase/supabase-js';

/**
 * Verifies the Supabase JWT from Authorization header and attaches user to req.
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    const supabase = createClient(supabaseUrl, publishableKey);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: error?.message || 'Invalid or expired token',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};
