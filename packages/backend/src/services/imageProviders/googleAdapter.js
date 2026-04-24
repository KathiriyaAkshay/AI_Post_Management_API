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

function isGeminiNativeImageModel(model) {
  const m = String(model || '').toLowerCase();
  return m.startsWith('gemini-') && m.includes('image');
}

function assertHttpsReferenceUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error('Google image generation: invalid reference image URL');
  }
  if (u.protocol !== 'https:') {
    throw new Error('Google image generation: reference image URL must use HTTPS');
  }
}

async function toInlineDataFromUrl(url) {
  assertHttpsReferenceUrl(url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google image generation: could not fetch reference image (${response.status})`);
  }
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const mimeType = contentType.split(';')[0] || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  return {
    inline_data: {
      mime_type: mimeType,
      data: Buffer.from(arrayBuffer).toString('base64'),
    },
  };
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
 * @param {string | null | undefined} [params.model] — e.g. gemini-2.5-flash-image or imagen-4.0-generate-001
 * @param {'text'|'reference'} [params.generationMode]
 * @param {string} [params.productReferenceUrl]
 * @param {string} [params.logoUrl]
 */
export async function generateWithGoogle({
  prompt,
  aspectRatio = '1:1',
  apiKey,
  model: modelParam,
  generationMode,
  productReferenceUrl,
  logoUrl,
}) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Google image generation: missing API key (store a Google AI key under admin → google)');
  }

  const model =
    (typeof modelParam === 'string' && modelParam.trim()) ||
    process.env.GOOGLE_IMAGE_MODEL?.trim() ||
    'gemini-2.5-flash-image';

  const ar = googleImagenAspectRatio(aspectRatio);
  const pr = typeof productReferenceUrl === 'string' ? productReferenceUrl.trim() : '';
  const lg = typeof logoUrl === 'string' ? logoUrl.trim() : '';

  let imageUrl;
  let format = 'PNG';
  let resolvedMode = generationMode || (pr || lg ? 'reference' : 'text');

  if (isGeminiNativeImageModel(model)) {
    const url = `${IMAGEN_ENDPOINT}/${encodeURIComponent(model)}:generateContent`;
    const parts = [{ text: prompt }];
    if (pr) parts.push(await toInlineDataFromUrl(pr));
    if (lg) parts.push(await toInlineDataFromUrl(lg));
    console.log("=================")
    console.log("🚀 ~ generateWithGoogle ~ url:", url)
    console.log("=================")
    console.log("🚀 ~ generateWithGoogle ~ parts:", parts)
    console.log("=================")
    console.log("🚀 ~ generateWithGoogle ~ body:", JSON.stringify({
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: ar },
      },
    }))
    console.log("=================")
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: ar },
        },
      }),
    });

    const errText = await response.text();
    if (!response.ok) {
      throw new Error(`Google Gemini image failed: ${response.status} ${errText.slice(0, 2000)}`);
    }

    let json;
    try {
      json = JSON.parse(errText);
    } catch {
      throw new Error('Google Gemini image: response was not JSON');
    }

    console.log('[google.image.response]', { route: 'generateContent', model, response: json });

    const responseParts = json?.candidates?.[0]?.content?.parts;
    const imagePart = Array.isArray(responseParts)
      ? responseParts.find((p) => p?.inlineData?.data || p?.inline_data?.data)
      : null;
    const b64 = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
    const mime = imagePart?.inlineData?.mimeType || imagePart?.inline_data?.mime_type || 'image/png';

    if (typeof b64 !== 'string' || !b64.length) {
      throw new Error('Google Gemini image: no inline image data in response');
    }

    imageUrl = `data:${mime};base64,${b64}`;
    format = String(mime).includes('jpeg') ? 'JPEG' : 'PNG';
  } else {
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

    console.log('[google.image.response]', { route: 'predict', model, response: json });

    const extracted = extractFirstImageFromPredictResponse(json);
    if (!extracted) {
      const keys = json && typeof json === 'object' ? Object.keys(json).join(',') : '';
      throw new Error(`Google Imagen: no image in response (keys: ${keys || 'none'}). Check model id and API access.`);
    }

    const mime = extracted.mime.includes('jpeg') ? 'image/jpeg' : 'image/png';
    imageUrl = `data:${mime};base64,${extracted.b64}`;
    format = mime === 'image/jpeg' ? 'JPEG' : 'PNG';
    resolvedMode = generationMode || 'text';
  }

  const { width, height } = dimensionsForAspect(aspectRatio);

  return {
    imageUrl,
    width,
    height,
    format,
    promptUsed: prompt,
    metadata: {
      provider: 'google',
      model,
      generationMode: resolvedMode,
    },
  };
}
