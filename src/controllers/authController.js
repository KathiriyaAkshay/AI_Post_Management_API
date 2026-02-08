import {
  adminSignup,
  login,
  requestPasswordReset,
  resetPassword,
  updatePassword,
} from '../services/authService.js';

export async function loginHandler(req, res) {
  try {
    const { identifier, password } = req.body; // identifier can be email or username
    const result = await login(identifier, password);
    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        session: result.session,
      },
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.message || 'Login failed',
    });
  }
}

export async function forgotPasswordHandler(req, res) {
  try {
    const { email } = req.body;
    const result = await requestPasswordReset(email);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    // Don't reveal if email exists or not (security best practice)
    return res.status(200).json({
      success: true,
      data: { message: 'If the email exists, a password reset link has been sent.' },
    });
  }
}

export async function resetPasswordHandler(req, res) {
  try {
    const { access_token, password } = req.body;
    const result = await resetPassword(access_token, password);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Password reset failed',
    });
  }
}

export async function updatePasswordHandler(req, res) {
  try {
    const { password } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const result = await updatePassword(accessToken, password);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Password update failed',
    });
  }
}

export async function adminSignupHandler(req, res) {
  try {
    const { email, password, full_name } = req.body;
    const result = await adminSignup(email, password, full_name);
    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: 'admin',
        },
        session: result.session,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Admin signup failed',
    });
  }
}
