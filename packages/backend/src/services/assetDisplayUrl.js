import { getObjectStorage } from '../storage/getObjectStorage.js';
import { GENERATED_IMAGES_LOGICAL_BUCKET } from '../storage/constants.js';

/** Default 24h — presigned GET is read-only; override with `S3_ASSET_DISPLAY_URL_EXPIRY_SECONDS`. */
const DEFAULT_ASSET_DISPLAY_URL_EXPIRY_SEC = 86400;

export function getAssetDisplayUrlExpirySeconds() {
  const n = Number(process.env.S3_ASSET_DISPLAY_URL_EXPIRY_SECONDS ?? DEFAULT_ASSET_DISPLAY_URL_EXPIRY_SEC);
  return Math.min(
    604800,
    Math.max(60, Number.isFinite(n) ? n : DEFAULT_ASSET_DISPLAY_URL_EXPIRY_SEC)
  );
}

/**
 * Resolves object path within logical bucket `generated-images` for presigned GET.
 *
 * @param {object} row - generated_images-shaped row with optional metadata.storagePath + image_url
 * @returns {string}
 */
export function resolveGeneratedImageStoragePath(row) {
  const meta =
    row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  const sp = typeof meta.storagePath === 'string' ? meta.storagePath.trim() : '';
  if (sp) return sp;

  const url = typeof row?.image_url === 'string' ? row.image_url.trim() : '';
  if (!url) return '';

  const supabaseMarker = '/storage/v1/object/public/generated-images/';
  const si = url.indexOf(supabaseMarker);
  if (si !== -1) {
    try {
      return decodeURIComponent(url.slice(si + supabaseMarker.length).split('?')[0]);
    } catch {
      /* fall through */
    }
  }

  const genMarker = '/generated-images/';
  const gi = url.indexOf(genMarker);
  if (gi !== -1) {
    try {
      return decodeURIComponent(url.slice(gi + genMarker.length).split('?')[0]);
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * When object storage is S3, adds short-lived presigned GET URL for display (`<img src>`).
 * Keeps `image_url` as the canonical stored reference (may 403 anonymously).
 *
 * @param {object} row
 */
export async function enrichGeneratedImageRowWithDisplayUrl(row) {
  if (!row || typeof row !== 'object') return row;

  try {
    const storage = getObjectStorage();
    if (storage.provider !== 's3') return row;

    const storagePath = resolveGeneratedImageStoragePath(row);
    if (!storagePath) return row;

    const { signedUrl } = await storage.createSignedDownload({
      bucket: GENERATED_IMAGES_LOGICAL_BUCKET,
      storagePath,
      expiresInSeconds: getAssetDisplayUrlExpirySeconds(),
    });

    return { ...row, image_display_url: signedUrl };
  } catch (err) {
    console.warn('[assetDisplayUrl] presigned GET failed:', err?.message || err);
    return row;
  }
}

/**
 * @param {object[]} rows
 */
export async function enrichGeneratedImageRowsWithDisplayUrls(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  return Promise.all(rows.map((r) => enrichGeneratedImageRowWithDisplayUrl(r)));
}
