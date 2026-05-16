#!/usr/bin/env node
/**
 * Sets a Supabase Auth user's password via the Admin API (requires SUPABASE_SECRET_KEY).
 *
 * Looks up auth user id by email in `profiles` first, then falls back to paging auth users.
 *
 * From repo root:
 *   ADMIN_NEW_PASSWORD='your-secure-password' npm run admin:set-password --workspace=backend -- admin@example.com
 *
 * Or from packages/backend:
 *   ADMIN_NEW_PASSWORD='your-secure-password' npm run admin:set-password -- admin@example.com
 *
 * Password source (first wins): argv[3], then ADMIN_NEW_PASSWORD env.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env'),
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const emailArg = process.argv[2]?.trim();
const passwordArg = process.argv[3];

const email = emailArg || process.env.ADMIN_EMAIL || 'admin@example.com';
const newPassword =
  (typeof passwordArg === 'string' && passwordArg.length > 0 ? passwordArg : null) ||
  process.env.ADMIN_NEW_PASSWORD;

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in environment (.env).');
  process.exit(1);
}

if (!newPassword || String(newPassword).length < 6) {
  console.error(
    'Missing new password (min 6 chars). Examples:\n' +
      '  ADMIN_NEW_PASSWORD=\'...\' npm run admin:set-password --workspace=backend -- admin@example.com\n' +
      '  npm run admin:set-password -- admin@example.com \'NewPassword\''
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(targetEmail) {
  const normalized = targetEmail.toLowerCase();
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .ilike('email', normalized)
    .maybeSingle();

  if (!profileError && profile?.id) {
    return { userId: profile.id, role: profile.role, source: 'profiles' };
  }

  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email || '').toLowerCase() === normalized);
    if (match) {
      return { userId: match.id, role: null, source: 'auth.users' };
    }
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

try {
  const found = await findUserIdByEmail(email);
  if (!found) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(found.userId, {
    password: String(newPassword),
  });

  if (error) {
    console.error('Supabase admin update failed:', error.message);
    process.exit(1);
  }

  console.log(`Password updated for ${email} (user id ${found.userId}).`);
  if (found.role != null) {
    console.log(`profiles.role: ${found.role}`);
  }
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
