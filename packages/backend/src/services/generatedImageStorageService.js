import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const BUCKET = 'generated-images';

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
 * @param {string} url
 */
function isAlreadyOurGeneratedPublicUrl(url) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!base || typeof url !== 'string') return false;
  return url.startsWith(`${base}/storage/v1/object/public/${BUCKET}/`);
}

/**
 * Downloads a provider result (HTTPS URL or data URL) and uploads to Supabase
 * `generated-images` so `generated_images.image_url` does not expire (OpenAI Azure SAS, etc.).
 *
 * If `SUPABASE_SECRET_KEY` is unset, returns the original URL unchanged (dev only — URLs may expire).
 *
 * @param {string} userId
 * @param {string} imageUrlOrDataUrl
 * @returns {Promise<{ publicUrl: string, storagePath: string }>}
 */
export async function mirrorGeneratedImageToSupabase(userId, imageUrlOrDataUrl) {
  if (!imageUrlOrDataUrl || typeof imageUrlOrDataUrl !== 'string') {
    throw new Error('mirrorGeneratedImageToSupabase: missing image URL');
  }

  if (!supabaseAdmin) {
    console.warn(
      '[generatedImageStorage] SUPABASE_SECRET_KEY missing; keeping provider URL (OpenAI/Azure links expire).'
    );
    return { publicUrl: imageUrlOrDataUrl, storagePath: '' };
  }

  if (isAlreadyOurGeneratedPublicUrl(imageUrlOrDataUrl)) {
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    const idx = imageUrlOrDataUrl.indexOf(prefix);
    const storagePath = idx >= 0 ? decodeURIComponent(imageUrlOrDataUrl.slice(idx + prefix.length)) : '';
    return { publicUrl: imageUrlOrDataUrl, storagePath };
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

  const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });
  if (upErr) {
    throw new Error(`Storage upload failed: ${upErr.message}`);
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = pub?.publicUrl;
  if (!publicUrl) {
    throw new Error('Could not resolve public URL for uploaded generated image');
  }

  return { publicUrl, storagePath };
}
