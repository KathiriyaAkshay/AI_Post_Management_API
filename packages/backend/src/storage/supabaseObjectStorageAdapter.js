import { supabaseAdmin } from '../config/supabase.js';
import {
  GENERATED_IMAGES_LOGICAL_BUCKET,
  isPublicReadLogicalBucket,
} from './constants.js';

/**
 * Supabase Storage implementation of the object storage port.
 */
export function createSupabaseObjectStorageAdapter() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '') || '';

  return {
    provider: /** @type {const} */ ('supabase'),

    canMirrorGeneratedImages() {
      return Boolean(supabaseAdmin);
    },

    /** @param {string} url */
    parseOwnedGeneratedImageUrl(url) {
      const prefix = `/storage/v1/object/public/${GENERATED_IMAGES_LOGICAL_BUCKET}/`;
      if (!supabaseUrl || typeof url !== 'string') return null;
      if (!url.startsWith(`${supabaseUrl}${prefix}`)) return null;
      const idx = url.indexOf(prefix);
      const storagePath =
        idx >= 0 ? decodeURIComponent(url.slice(idx + prefix.length).split('?')[0]) : '';
      return storagePath ? { storagePath } : null;
    },

    /**
     * @param {import('./constants.js').LogicalBucket} logicalBucket
     * @param {string} storagePath
     * @param {Buffer} buffer
     * @param {string} contentType
     */
    async uploadBuffer(logicalBucket, storagePath, buffer, contentType) {
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client unavailable (SUPABASE_SECRET_KEY)');
      }
      const { error: upErr } = await supabaseAdmin.storage.from(logicalBucket).upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
      const { data } = supabaseAdmin.storage.from(logicalBucket).getPublicUrl(storagePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('Could not resolve public URL for uploaded object');
      return { publicUrl };
    },

    /**
     * @param {import('./constants.js').LogicalBucket} logicalBucket
     * @param {string} storagePath
     */
    getPublicUrl(logicalBucket, storagePath) {
      if (!supabaseAdmin) return '';
      const { data } = supabaseAdmin.storage.from(logicalBucket).getPublicUrl(storagePath);
      return data?.publicUrl || '';
    },

    /**
     * @param {object} params
     * @param {import('./constants.js').LogicalBucket} params.bucket
     * @param {string} params.storagePath
     * @param {string} [params.contentType]
     */
    async createSignedUpload({ bucket, storagePath, contentType }) {
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client unavailable (SUPABASE_SECRET_KEY)');
      }
      const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(storagePath);
      if (error) throw error;
      /** @type {Record<string, string>} */
      const headers = {};
      if (contentType) headers['Content-Type'] = contentType;
      return {
        signedUrl: data.signedUrl,
        headers,
      };
    },

    /**
     * @param {object} params
     * @param {import('./constants.js').LogicalBucket} params.bucket
     * @param {string} params.storagePath
     * @param {number} params.expiresInSeconds
     */
    async createSignedDownload({ bucket, storagePath, expiresInSeconds }) {
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client unavailable (SUPABASE_SECRET_KEY)');
      }
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);
      if (error) throw error;
      return { signedUrl: data.signedUrl };
    },

    /**
     * Stable URL returned to clients after upload for public-read buckets.
     * @param {import('./constants.js').LogicalBucket} logicalBucket
     * @param {string} storagePath
     */
    resolvePublicUrlAfterUpload(logicalBucket, storagePath) {
      if (!isPublicReadLogicalBucket(logicalBucket)) return '';
      return this.getPublicUrl(logicalBucket, storagePath);
    },
  };
}
