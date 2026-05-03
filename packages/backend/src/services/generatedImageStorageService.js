import { randomUUID } from 'crypto';
import { getObjectStorage } from '../storage/getObjectStorage.js';
import { GENERATED_IMAGES_LOGICAL_BUCKET } from '../storage/constants.js';

function extensionFromMime(mime) {
  if (!mime) return 'png';
  const m = mime.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  return 'png';
}

function parseDataUrl(dataUrl) {
  const m = /^data:([^;,]+);base64,(.+)$/i.exec(String(dataUrl));
  if (!m) return null;
  try {
    return { mime: m[1].trim(), buffer: Buffer.from(m[2], 'base64') };
  } catch {
    return null;
  }
}

/**
 * Downloads a provider result (HTTPS URL or data URL) and uploads via the configured object storage
 * (`generated-images`) so `generated_images.image_url` does not expire (OpenAI Azure SAS, etc.).
 *
 * If mirroring is unavailable (Supabase without service role), returns the original URL unchanged (dev only).
 *
 * @param {string} userId
 * @param {string} imageUrlOrDataUrl
 * @returns {Promise<{ publicUrl: string, storagePath: string }>}
 */
export async function mirrorGeneratedImageToStorage(userId, imageUrlOrDataUrl) {
  if (!imageUrlOrDataUrl || typeof imageUrlOrDataUrl !== 'string') {
    throw new Error('mirrorGeneratedImageToStorage: missing image URL');
  }

  const storage = getObjectStorage();

  if (!storage.canMirrorGeneratedImages()) {
    console.warn(
      '[generatedImageStorage] Mirroring disabled (e.g. SUPABASE_SECRET_KEY missing); keeping provider URL (links may expire).'
    );
    return { publicUrl: imageUrlOrDataUrl, storagePath: '' };
  }

  const owned = storage.parseOwnedGeneratedImageUrl(imageUrlOrDataUrl);
  if (owned?.storagePath) {
    return { publicUrl: imageUrlOrDataUrl, storagePath: owned.storagePath };
  }

  let buffer;
  let contentType = 'image/png';

  if (imageUrlOrDataUrl.startsWith('data:')) {
    const parsed = parseDataUrl(imageUrlOrDataUrl);
    if (!parsed) throw new Error('Invalid data URL for generated image');
    buffer = parsed.buffer;
    contentType = parsed.mime.split(';')[0].trim() || 'image/png';
  } else if (/^https?:\/\//i.test(imageUrlOrDataUrl)) {
    const res = await fetch(imageUrlOrDataUrl, { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(`Failed to download generated image for storage (${res.status})`);
    }
    buffer = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type');
    if (ct) contentType = ct.split(';')[0].trim() || contentType;
  } else {
    throw new Error('Unsupported image URL for storage (expected https: URL or data: URL)');
  }

  const ext = extensionFromMime(contentType);
  const storagePath = `${userId}/${randomUUID()}.${ext}`;

  const { publicUrl } = await storage.uploadBuffer(
    GENERATED_IMAGES_LOGICAL_BUCKET,
    storagePath,
    buffer,
    contentType
  );

  if (!publicUrl) {
    throw new Error('Could not resolve public URL for uploaded generated image');
  }

  return { publicUrl, storagePath };
}

/** @deprecated Use mirrorGeneratedImageToStorage */
export const mirrorGeneratedImageToSupabase = mirrorGeneratedImageToStorage;
