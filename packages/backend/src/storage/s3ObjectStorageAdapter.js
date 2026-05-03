import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  GENERATED_IMAGES_LOGICAL_BUCKET,
  isPublicReadLogicalBucket,
} from './constants.js';

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`S3 storage requires ${name}`);
  return v;
}

function fullObjectKey(logicalBucket, storagePath) {
  const path = storagePath.replace(/^\/+/, '');
  return `${logicalBucket}/${path}`;
}

function encodePublicPath(fullKey) {
  return fullKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * S3 (+ optional CDN base URL) implementation of the object storage port.
 *
 * Objects use keys `{logicalBucket}/{storagePath}` inside a single bucket (default layout).
 */
export function createS3ObjectStorageAdapter() {
  const bucket = requireEnv('S3_BUCKET');
  const region = process.env.AWS_REGION?.trim() || process.env.S3_REGION?.trim() || 'us-east-1';
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';

  const client = new S3Client({
    region,
    ...(process.env.AWS_ENDPOINT_URL_S3?.trim()
      ? { endpoint: process.env.AWS_ENDPOINT_URL_S3.trim(), forcePathStyle: true }
      : {}),
  });

  const defaultUploadExpirySec = Math.min(
    604800,
    Math.max(60, Number(process.env.S3_UPLOAD_URL_EXPIRY_SECONDS || 3600) || 3600)
  );

  return {
    provider: /** @type {const} */ ('s3'),

    canMirrorGeneratedImages() {
      return true;
    },

    /** @param {string} url */
    parseOwnedGeneratedImageUrl(url) {
      if (!publicBase || typeof url !== 'string') return null;
      const expectedPrefix = `${publicBase}/${GENERATED_IMAGES_LOGICAL_BUCKET}/`;
      if (!url.startsWith(expectedPrefix)) return null;
      let rest = url.slice(expectedPrefix.length).split('?')[0];
      try {
        rest = decodeURIComponent(rest);
      } catch {
        /* keep raw */
      }
      return rest ? { storagePath: rest } : null;
    },

    /**
     * @param {import('./constants.js').LogicalBucket} logicalBucket
     * @param {string} storagePath
     * @param {Buffer} buffer
     * @param {string} contentType
     */
    async uploadBuffer(logicalBucket, storagePath, buffer, contentType) {
      const Key = fullObjectKey(logicalBucket, storagePath);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key,
          Body: buffer,
          ContentType: contentType,
        })
      );
      const publicUrl = this.getPublicUrl(logicalBucket, storagePath);
      if (!publicUrl && isPublicReadLogicalBucket(logicalBucket)) {
        throw new Error(
          'S3_PUBLIC_BASE_URL is required for public-read buckets so generated image URLs can be returned'
        );
      }
      return { publicUrl };
    },

    /**
     * @param {import('./constants.js').LogicalBucket} logicalBucket
     * @param {string} storagePath
     */
    getPublicUrl(logicalBucket, storagePath) {
      if (!publicBase || !isPublicReadLogicalBucket(logicalBucket)) return '';
      const Key = fullObjectKey(logicalBucket, storagePath);
      return `${publicBase}/${encodePublicPath(Key)}`;
    },

    /**
     * @param {object} params
     * @param {import('./constants.js').LogicalBucket} params.bucket
     * @param {string} params.storagePath
     * @param {string} [params.contentType]
     */
    async createSignedUpload({ bucket: logicalBucket, storagePath, contentType }) {
      const Key = fullObjectKey(logicalBucket, storagePath);
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key,
        ...(contentType ? { ContentType: contentType } : {}),
      });
      const signedUrl = await getSignedUrl(client, cmd, { expiresIn: defaultUploadExpirySec });
      /** @type {Record<string, string>} */
      const headers = {};
      if (contentType) headers['Content-Type'] = contentType;
      return { signedUrl, headers };
    },

    /**
     * @param {object} params
     * @param {import('./constants.js').LogicalBucket} params.bucket
     * @param {string} params.storagePath
     * @param {number} params.expiresInSeconds
     */
    async createSignedDownload({ bucket: logicalBucket, storagePath, expiresInSeconds }) {
      const Key = fullObjectKey(logicalBucket, storagePath);
      const cmd = new GetObjectCommand({ Bucket: bucket, Key });
      const signedUrl = await getSignedUrl(client, cmd, {
        expiresIn: Math.min(604800, Math.max(1, expiresInSeconds)),
      });
      return { signedUrl };
    },

    /**
     * @param {import('./constants.js').LogicalBucket} logicalBucket
     * @param {string} storagePath
     */
    resolvePublicUrlAfterUpload(logicalBucket, storagePath) {
      return this.getPublicUrl(logicalBucket, storagePath);
    },
  };
}
