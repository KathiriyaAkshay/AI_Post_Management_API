/**
 * Google Imagen via Gemini API (API key from AI Studio / Google AI).
 * @see https://ai.google.dev/gemini-api/docs/imagen
 */

const IMAGEN_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** @param {string} [aspectRatio] */
function googleImagenAspectRatio(aspectRatio) {
  if (aspectRatio === '16:9') return '16:9';
  if (aspectRatio === '9:16') return '9:16';
  if (aspectRatio === '4:3') return '4:3';
  if (aspectRatio === '3:4') return '3:4';
  return '1:1';
}

/** Approximate output size hints for DB / UI (Imagen 1K presets vary by ratio). */
function dimensionsForAspect(aspectRatio) {
  if (aspectRatio === '16:9') return { width: 1344, height: 768 };
  if (aspectRatio === '9:16') return { width: 768, height: 1344 };
  if (aspectRatio === '4:3') return { width: 1184, height: 864 };
  if (aspectRatio === '3:4') return { width: 864, height: 1184 };
  return { width: 1024, height: 1024 };
}

/**
 * @param {unknown} json
 * @returns {{ b64: string, mime: string } | null}
 */
function extractFirstImageFromPredictResponse(json) {
  const preds = json?.predictions;
  if (!Array.isArray(preds) || preds.length === 0) return null;
  const p = preds[0];
  if (typeof p === 'string') return { b64: p, mime: 'image/png' };
  const b64 = p?.bytesBase64Encoded || p?.bytes_base64_encoded;
  const mime = p?.mimeType || p?.mime_type || 'image/png';
  if (typeof b64 === 'string' && b64.length > 0) return { b64, mime };
  return null;
}

/**
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} [params.aspectRatio]
 * @param {string} params.apiKey
 * @param {string | null | undefined} [params.model] — e.g. imagen-4.0-generate-001
 */
export async function generateWithGoogle({ prompt, aspectRatio = '1:1', apiKey, model: modelParam }) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Google image generation: missing API key (store a Google AI key under admin → google)');
  }

  const model =
    (typeof modelParam === 'string' && modelParam.trim()) ||
    process.env.GOOGLE_IMAGE_MODEL?.trim() ||
    'imagen-4.0-generate-001';

  const ar = googleImagenAspectRatio(aspectRatio);
  const url = `${IMAGEN_ENDPOINT}/${encodeURIComponent(model)}:predict`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim(),
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: ar,
        personGeneration: process.env.GOOGLE_IMAGEN_PERSON_GENERATION?.trim() || 'allow_adult',
      },
    }),
  });

  const errText = await response.text();
  if (!response.ok) {
    throw new Error(`Google Imagen failed: ${response.status} ${errText.slice(0, 2000)}`);
  }

  let json;
  try {
    json = JSON.parse(errText);
  } catch {
    throw new Error('Google Imagen: response was not JSON');
  }

  const extracted = extractFirstImageFromPredictResponse(json);
  if (!extracted) {
    const keys = json && typeof json === 'object' ? Object.keys(json).join(',') : '';
    throw new Error(
      `Google Imagen: no image in response (keys: ${keys || 'none'}). Check model id and API access.`
    );
  }

  const mime = extracted.mime.includes('jpeg') ? 'image/jpeg' : 'image/png';
  const imageUrl = `data:${mime};base64,${extracted.b64}`;
  const { width, height } = dimensionsForAspect(aspectRatio);
  const format = mime === 'image/jpeg' ? 'JPEG' : 'PNG';

  return {
    imageUrl,
    width,
    height,
    format,
    promptUsed: prompt,
  };
}
