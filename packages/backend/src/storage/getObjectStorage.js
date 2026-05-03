import { createSupabaseObjectStorageAdapter } from './supabaseObjectStorageAdapter.js';
import { createS3ObjectStorageAdapter } from './s3ObjectStorageAdapter.js';

/** @type {ReturnType<typeof createSupabaseObjectStorageAdapter>|ReturnType<typeof createS3ObjectStorageAdapter>|null} */
let cached = null;

/**
 * Object storage facade (S3 by default; Supabase Storage opt-in). Singleton per process.
 *
 * `STORAGE_PROVIDER`:
 * - `s3` (default): AWS S3 (or S3-compatible endpoint via AWS_ENDPOINT_URL_S3).
 * - `supabase`: Supabase Storage via service role (rollback / emergencies).
 */
export function getObjectStorage() {
  if (cached) return cached;

  const raw = process.env.STORAGE_PROVIDER?.trim();
  const provider = (raw ? raw.toLowerCase() : 's3').trim();

  if (provider === 's3') {
    cached = createS3ObjectStorageAdapter();
    return cached;
  }

  if (provider === 'supabase') {
    cached = createSupabaseObjectStorageAdapter();
    return cached;
  }

  throw new Error(
    `[storage] Invalid STORAGE_PROVIDER="${raw}". Use "s3" (default) or "supabase".`
  );
}

/** Test helper — resets singleton between tests (optional). */
export function resetObjectStorageForTests() {
  cached = null;
}
