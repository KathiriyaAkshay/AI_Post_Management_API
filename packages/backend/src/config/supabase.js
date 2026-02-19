import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY');
}

/** Client for user-facing operations (publishable/anon key, respects RLS) */
export const supabase = createClient(supabaseUrl, publishableKey);

/** Admin client for privileged operations (secret/service_role key, bypasses RLS) */
export const supabaseAdmin = secretKey
  ? createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
