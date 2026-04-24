/**
 * OpenAI Images API (direct). Requires decrypted API key from DB.
 *
 * - **Text:** `POST /v1/images/generations` (DALL·E 3, GPT Image, etc.)
 * - **Reference:** `POST /v1/images/edits` with one or more `image` parts when
 *   `generationMode === 'reference'` and `productReferenceUrl` / `logoUrl` are set.
 *   Uses a GPT Image edit model (`OPENAI_IMAGE_EDIT_MODEL` or `gpt-image-1` when the
 *   configured generations model is not a `gpt-image*` id).
 *
 * @see https://platform.openai.com/docs/api-reference/images/create
 * @see https://platform.openai.com/docs/api-reference/images/createEdit
 */

/** @param {string} aspectRatio @param {string} model */
function openaiSizeFromAspectRatio(aspectRatio, model) {
  const m = (model || '').toLowerCase();
  if (m.includes('dall-e-2')) return '1024x1024';
  if (aspectRatio === '16:9') return '1792x1024';
  if (aspectRatio === '9:16') return '1024x1792';
  return '1024x1024';
}

/** GPT Image edit sizes (per OpenAI size table for square / landscape / portrait). */
function gptImageEditSizeFromAspectRatio(aspectRatio) {
  if (aspectRatio === '16:9') return '1536x1024';
  if (aspectRatio === '9:16') return '1024x1536';
  return '1024x1024';
}

function assertHttpsReferenceUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error('Invalid reference image URL');
  }
  if (u.protocol !== 'https:') {
    throw new Error('Reference image URL must use HTTPS');
  }
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host === 'metadata.google.internal'
  ) {
    throw new Error('Disallowed reference image host');
  }
}

/**
 * @param {string|null|undefined} modelParam — configured generations model
 * @returns {string} model id for `/v1/images/edits`
 */
function resolveOpenAIEditModel(modelParam) {
  const raw = typeof modelParam === 'string' ? modelParam.trim() : '';
  if (raw && raw.toLowerCase().includes('gpt-image')) return raw;
  return process.env.OPENAI_IMAGE_EDIT_MODEL?.trim() || 'gpt-image-1';
}

function parseSizeToDimensions(size) {
  const [w, h] = String(size || '1024x1024')
    .split('x')
    .map((n) => parseInt(n, 10));
  return {
    width: Number.isFinite(w) ? w : 1024,
    height: Number.isFinite(h) ? h : 1024,
  };
}

function logOpenAIResponse(route, json) {
  console.log('[openai.image.response]', {
    route,
    response: json,
  });
}

/**
 * GPT Image edits with **JSON** body (`images: [{ image_url }]`) — OpenAI fetches URLs.
 * @see https://developers.openai.com/api/reference/resources/images/methods/edit
 *
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.aspectRatio]
 * @param {string} opts.apiKey
 * @param {string} opts.modelForEdit
 * @param {string[]} opts.imageUrls — HTTPS URLs (validated)
 */
async function openaiImagesEditJson({ prompt, aspectRatio = '1:1', apiKey, modelForEdit, imageUrls }) {
  if (!imageUrls?.length) {
    throw new Error('OpenAI image edits: at least one reference image URL is required');
  }

  for (const u of imageUrls) {
    assertHttpsReferenceUrl(u);
  }

  const size = gptImageEditSizeFromAspectRatio(aspectRatio);
  const mLower = String(modelForEdit).toLowerCase();
  /**
   * `input_fidelity: high` is not supported on all GPT Image edit models
   * (e.g. gpt-image-1-mini, gpt-image-2 — API returns `invalid_input_fidelity_model`).
   */
  const canUseHighFidelity =
    !mLower.includes('gpt-image-1-mini') && !mLower.includes('gpt-image-2');

  const body = {
    model: modelForEdit,
    prompt,
    size,
    n: 1,
    images: imageUrls.map((image_url) => ({ image_url })),
    ...(canUseHighFidelity ? { input_fidelity: 'high' } : {}),
  };

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const errText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI image edits failed: ${response.status} ${errText.slice(0, 2000)}`);
  }

  let json;
  try {
    json = JSON.parse(errText);
  } catch {
    throw new Error('OpenAI image edits: invalid JSON response');
  }
  logOpenAIResponse('edits', json);

  const item = json?.data?.[0];
  const imageUrl = item?.url;
  const b64 = item?.b64_json;
  const { width, height } = parseSizeToDimensions(size);

  if (typeof imageUrl === 'string' && imageUrl.length > 0) {
    return {
      imageUrl,
      width,
      height,
      format: 'PNG',
      promptUsed: prompt,
      metadata: {
        provider: 'openai',
        model: modelForEdit,
        generationMode: 'reference',
        openaiRoute: 'edits',
      },
    };
  }
  if (typeof b64 === 'string' && b64.length > 0) {
    return {
      imageUrl: `data:image/png;base64,${b64}`,
      width,
      height,
      format: 'PNG',
      promptUsed: prompt,
      metadata: {
        provider: 'openai',
        model: modelForEdit,
        generationMode: 'reference',
        openaiRoute: 'edits',
      },
    };
  }

  throw new Error('OpenAI image edits: no url or b64_json in response');
}

/**
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} [params.aspectRatio]
 * @param {string} params.apiKey
 * @param {string} [params.model] — from DB `provider_models.openai`, else env `OPENAI_IMAGE_MODEL`, else dall-e-3
 * @param {'text'|'reference'} [params.generationMode]
 * @param {string} [params.productReferenceUrl]
 * @param {string} [params.logoUrl]
 */
export async function generateWithOpenAI({
  prompt,
  aspectRatio = '1:1',
  apiKey,
  model: modelParam,
  generationMode,
  productReferenceUrl,
  logoUrl,
}) {
  const model =
    (typeof modelParam === 'string' && modelParam.trim()) ||
    process.env.OPENAI_IMAGE_MODEL?.trim() ||
    'dall-e-3';

  const pr = typeof productReferenceUrl === 'string' && productReferenceUrl.trim() ? productReferenceUrl.trim() : '';
  const lg = typeof logoUrl === 'string' && logoUrl.trim() ? logoUrl.trim() : '';
  const useReferencePath = generationMode === 'reference' && (pr || lg);

  if (useReferencePath) {
    const imageUrls = [pr, lg].filter(Boolean);
    const editModel = resolveOpenAIEditModel(model);
    return openaiImagesEditJson({
      prompt,
      aspectRatio,
      apiKey,
      modelForEdit: editModel,
      imageUrls,
    });
  }

  const size = openaiSizeFromAspectRatio(aspectRatio, model);

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      response_format: 'url',
    }),
  });

  const errText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI image generation failed: ${response.status} ${errText}`);
  }

  let json;
  try {
    json = JSON.parse(errText);
  } catch {
    throw new Error(`OpenAI image generation: invalid JSON response`);
  }
  logOpenAIResponse('generations', json);

  const item = json?.data?.[0];
  const imageUrl = item?.url;
  const b64 = item?.b64_json;

  const { width, height } = parseSizeToDimensions(size);

  if (typeof imageUrl === 'string' && imageUrl.length > 0) {
    return {
      imageUrl,
      width,
      height,
      format: 'PNG',
      promptUsed: prompt,
      metadata: {
        provider: 'openai',
        model,
        generationMode: 'text',
        openaiRoute: 'generations',
      },
    };
  }
  if (typeof b64 === 'string' && b64.length > 0) {
    return {
      imageUrl: `data:image/png;base64,${b64}`,
      width,
      height,
      format: 'PNG',
      promptUsed: prompt,
      metadata: {
        provider: 'openai',
        model,
        generationMode: 'text',
        openaiRoute: 'generations',
      },
    };
  }

  throw new Error('OpenAI image generation: no URL or b64_json in response');
}
