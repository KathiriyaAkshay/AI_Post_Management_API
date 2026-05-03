import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getObjectStorage } from '../storage/getObjectStorage.js';
import { isLogicalBucket } from '../storage/constants.js';

const router = Router();

router.use(authMiddleware);

/**
 * Get a signed upload URL for direct client upload (Supabase Storage or S3 presigned PUT).
 *
 * POST /storage/signed-url
 * Body: { bucket, fileName, contentType? }
 */
router.post('/signed-url', async (req, res) => {
  try {
    const { bucket, fileName, contentType } = req.body;

    if (!isLogicalBucket(bucket)) {
      return res.status(400).json({
        success: false,
        error: `bucket must be one of: generated-images, product-references, campaign-thumbnails, profile-logos`,
      });
    }
    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    const storagePath = `${req.user.id}/${Date.now()}-${fileName}`;
    const storage = getObjectStorage();

    const { signedUrl, headers } = await storage.createSignedUpload({
      bucket,
      storagePath,
      contentType: typeof contentType === 'string' ? contentType : undefined,
    });

    const publicUrl = storage.resolvePublicUrlAfterUpload(bucket, storagePath);

    res.json({
      success: true,
      data: {
        signedUrl,
        uploadHeaders: headers || {},
        filePath: storagePath,
        publicUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get a signed download URL for a private object (or short-lived access).
 *
 * POST /storage/download-url
 * Body: { bucket, filePath, expiresIn? }
 */
router.post('/download-url', async (req, res) => {
  try {
    const { bucket, filePath, expiresIn = 3600 } = req.body;

    if (!bucket || !filePath) {
      return res.status(400).json({ success: false, error: 'bucket and filePath are required' });
    }
    if (!isLogicalBucket(bucket)) {
      return res.status(400).json({ success: false, error: 'Invalid bucket' });
    }

    const storage = getObjectStorage();
    const { signedUrl } = await storage.createSignedDownload({
      bucket,
      storagePath: filePath,
      expiresInSeconds: expiresIn,
    });

    res.json({ success: true, data: { signedUrl } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
