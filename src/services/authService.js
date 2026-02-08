import { supabase } from '../config/supabase.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Login user (admin or customer) via email or username
 */
export async function login(identifier, password) {
  let email = identifier;

  // If identifier is not an email format, treat it as username and look up email
  if (!identifier.includes('@')) {
    if (!supabaseAdmin) {
      throw new Error('SUPABASE_SECRET_KEY required for username login');
    }
    const { data: profile, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('username', identifier)
      .single();

    if (lookupError || !profile) {
      throw new Error('Invalid username or password');
    }
    email = profile.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  // Get user profile to return role and additional info
  let profile = null;
  if (supabaseAdmin) {
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('role, username, business_name')
      .eq('id', data.user.id)
      .single();
    profile = profileData;
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role || 'customer',
      username: profile?.username || null,
      business_name: profile?.business_name || null,
    },
    session: data.session,
  };
}

/**
 * Registers a new admin user via Supabase Auth and creates profile with admin role.
 */
export async function adminSignup(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'admin',
        full_name: fullName || '',
      },
    },
  });

  if (error) {
    throw error;
  }

  // Create profile (no trigger - we handle it here)
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SECRET_KEY required for admin signup');
  }
  if (data.user) {
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName || data.user.user_metadata?.full_name || '',
        role: 'admin',
      },
      { onConflict: 'id' }
    );
    if (profileError) throw profileError;
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * Request password reset - sends reset email
 */
export async function requestPasswordReset(email) {
  // Look up username if needed for email
  let username = null;
  if (supabaseAdmin) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('email', email)
      .single();
    username = profile?.username;
  }

  // Generate reset token via Supabase
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    throw error;
  }

  return { message: 'Password reset email sent', email };
}

/**
 * Reset password using access token from reset email
 * The token comes from Supabase's password reset email link
 */
export async function resetPassword(accessToken, newPassword) {
  // Set the session with the reset token
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: '',
  });

  if (sessionError) {
    throw new Error('Invalid or expired reset token');
  }

  // Update password
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }

  return { message: 'Password reset successfully' };
}

/**
 * Update password (requires authenticated session)
 */
export async function updatePassword(accessToken, newPassword) {
  // Import createClient dynamically
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  
  // Create a client with the user's access token
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await userClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }

  return { message: 'Password updated successfully' };
}
