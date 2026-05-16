import { getObjectStorage } from './getObjectStorage.js';
import { isLogicalBucket, LOGICAL_BUCKETS } from './constants.js';

/** @typedef {import('./constants.js').LogicalBucket} LogicalBucket */

export class StoredImageUrlError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'StoredImageUrlError';
    this.statusCode = 400;
  }
}

function badRequest(message) {
  return new StoredImageUrlError(message);
}

/**
 * Parse app-managed storage URL → logical bucket + key path within bucket.
 * Supports S3 virtual-hosted URLs, URLs under `S3_PUBLIC_BASE_URL`, and Supabase public object URLs.
 *
 * @param {string} urlString
 * @returns {{ logicalBucket: LogicalBucket, storagePath: string } | null}
 */
export function parseStoredImageLocation(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  const trimmed = urlString.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;

  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (supabaseUrl && trimmed.startsWith(supabaseUrl)) {
    const marker = '/storage/v1/object/public/';
    const i = trimmed.indexOf(marker);
    if (i === -1) return null;
    const rest = trimmed.slice(i + marker.length).split('?')[0];
    const segments = rest.split('/').filter(Boolean).map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
    if (segments.length < 2) return null;
    const logicalBucket = segments[0];
    if (!isLogicalBucket(logicalBucket)) return null;
    return {
      logicalBucket,
      storagePath: segments.slice(1).join('/'),
    };
  }

  const bucketName = process.env.S3_BUCKET?.trim();
  const region =
    process.env.AWS_REGION?.trim() || process.env.S3_REGION?.trim() || 'us-east-1';

  if (bucketName) {
    const host = u.hostname.toLowerCase();
    const vh = new RegExp(
      `^${escapeRegex(bucketName)}\\.s3(?:\\.dualstack)?\\.([^.]+)\\.amazonaws\\.com$`,
      'i'
    );
    const vm = vh.exec(host);
    if (vm) {
      const segments = u.pathname.split('/').filter(Boolean).map(decodeSeg);
      if (segments.length < 2) return null;
      const logicalBucket = segments[0];
      if (!isLogicalBucket(logicalBucket)) return null;
      return {
        logicalBucket,
        storagePath: segments.slice(1).join('/'),
      };
    }
  }

  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '').trim();
  if (publicBase) {
    try {
      const base = new URL(publicBase);
      if (u.origin === base.origin) {
        const rawPath = u.pathname.replace(/^\/+/, '');
        const segments = rawPath.split('/').filter(Boolean).map(decodeSeg);
        if (segments.length < 2) return null;
        const logicalBucket = segments[0];
        if (!isLogicalBucket(logicalBucket)) return null;
        return {
          logicalBucket,
          storagePath: segments.slice(1).join('/'),
        };
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

function decodeSeg(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string|undefined|null} url
 * @param {string} fieldLabel
 * @param {LogicalBucket} expectedBucket
 */
export function assertStoredImageUrlForBucket(url, fieldLabel, expectedBucket) {
  if (url === undefined || url === null) return;
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s) return;

  const loc = parseStoredImageLocation(s);
  if (!loc) {
    throw badRequest(
      `${fieldLabel} must be a URL under this app's storage (S3 or Supabase Storage) using prefix "${expectedBucket}/". Upload via POST /storage/signed-url first.`
    );
  }
  if (loc.logicalBucket !== expectedBucket) {
    throw badRequest(
      `${fieldLabel} must use the "${expectedBucket}" storage area; got "${loc.logicalBucket}".`
    );
  }
}

/**
 * @param {{ productReferenceUrl?: string|null, thumbnailUrl?: string|null }} fields
 */
export function assertCampaignStoredImageUrls(fields) {
  const pr = fields.productReferenceUrl;
  const th = fields.thumbnailUrl;
  if (pr !== undefined && pr !== null && String(pr).trim()) {
    assertStoredImageUrlForBucket(String(pr).trim(), 'productReferenceUrl', 'product-references');
  }
  if (th !== undefined && th !== null && String(th).trim()) {
    assertStoredImageUrlForBucket(String(th).trim(), 'thumbnailUrl', 'campaign-thumbnails');
  }
}

/**
 * @param {string|undefined|null} logo
 */
export function assertProfileLogoStoredImageUrl(logo) {
  assertStoredImageUrlForBucket(
    logo === undefined || logo === null ? '' : String(logo),
    'logo',
    'profile-logos'
  );
}

/**
 * Before calling external image APIs that fetch HTTPS references (private S3 objects are not fetchable).
 *
 * @param {{ logoUrl?: string|null, productReferenceUrl?: string|null }} params
 */
export async function presignReferenceImagesForProvider({ logoUrl, productReferenceUrl }) {
  const storage = getObjectStorage();
  const ttlRaw = Number(process.env.S3_PROVIDER_REFERENCE_URL_TTL_SECONDS ?? 7200);
  const expiresInSeconds = Math.min(604800, Math.max(300, Number.isFinite(ttlRaw) ? ttlRaw : 7200));

  /** @type {{ logoUrl?: string, productReferenceUrl?: string }} */
  const out = {};

  async function maybePresign(raw, key) {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return undefined;
    const s = raw.trim();
    const loc = parseStoredImageLocation(s);
    if (!loc) return s;
    if (storage.provider !== 's3') return s;
    try {
      const { signedUrl } = await storage.createSignedDownload({
        bucket: loc.logicalBucket,
        storagePath: loc.storagePath,
        expiresInSeconds,
      });
      return signedUrl;
    } catch (err) {
      console.warn('[storedImageUrlPolicy] presign for provider failed:', key, err?.message || err);
      return s;
    }
  }

  const lg = typeof logoUrl === 'string' ? logoUrl.trim() : '';
  const pr = typeof productReferenceUrl === 'string' ? productReferenceUrl.trim() : '';

  if (lg) out.logoUrl = await maybePresign(lg, 'logoUrl');
  if (pr) out.productReferenceUrl = await maybePresign(pr, 'productReferenceUrl');

  return out;
}
