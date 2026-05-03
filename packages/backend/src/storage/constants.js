/** @typedef {'generated-images'|'product-references'|'campaign-thumbnails'|'profile-logos'} LogicalBucket */

/** Buckets exposed to authenticated clients via /storage/* */
export const LOGICAL_BUCKETS = /** @type {const} */ ([
  'generated-images',
  'product-references',
  'campaign-thumbnails',
  'profile-logos',
]);

/** Logical buckets whose objects are readable without a signed GET (after upload). */
export const PUBLIC_READ_LOGICAL_BUCKETS = new Set(
  /** @type {LogicalBucket[]} */ ([
    'generated-images',
    'campaign-thumbnails',
    'profile-logos',
  ])
);

export const GENERATED_IMAGES_LOGICAL_BUCKET = /** @type {LogicalBucket} */ ('generated-images');

/**
 * @param {string} bucket
 * @returns {bucket is LogicalBucket}
 */
export function isLogicalBucket(bucket) {
  return LOGICAL_BUCKETS.includes(bucket);
}

/**
 * @param {string} bucket
 * @returns {boolean}
 */
export function isPublicReadLogicalBucket(bucket) {
  return PUBLIC_READ_LOGICAL_BUCKETS.has(bucket);
}
