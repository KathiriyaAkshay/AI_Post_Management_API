import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// All upload routes require authentication
router.use(authMiddleware);

/**
 * Get a signed upload URL for a file.
 * The client uploads directly to Supabase Storage using this signed URL.
 *
 * POST /storage/signed-url
 * Body: { bucket: 'generated-images' | 'product-references' | 'campaign-thumbnails', fileName: string, contentType: string }
 */
router.post('/signed-url', async (req, res) => {
  try {
    const { bucket, fileName, contentType } = req.body;

    const ALLOWED_BUCKETS = ['generated-images', 'product-references', 'campaign-thumbnails'];
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return res.status(400).json({ success: false, error: `Bucket must be one of: ${ALLOWED_BUCKETS.join(', ')}` });
    }
    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    // Namespace under the user's ID to avoid collisions
    const filePath = `${req.user.id}/${Date.now()}-${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    // Build the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    res.json({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        filePath,
        publicUrl: publicUrlData.publicUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get a signed download URL for a private file.
 *
 * POST /storage/download-url
 * Body: { bucket: string, filePath: string, expiresIn: number (seconds, default 3600) }
 */
router.post('/download-url', async (req, res) => {
  try {
    const { bucket, filePath, expiresIn = 3600 } = req.body;

    if (!bucket || !filePath) {
      return res.status(400).json({ success: false, error: 'bucket and filePath are required' });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;

    res.json({ success: true, data: { signedUrl: data.signedUrl } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
