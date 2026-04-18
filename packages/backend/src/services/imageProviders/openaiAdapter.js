/**
 * OpenAI Images API (direct). Requires decrypted API key from DB.
 * @see https://platform.openai.com/docs/api-reference/images/create
 */

function openaiSizeFromAspectRatio(aspectRatio, model) {
  const m = (model || '').toLowerCase();
  if (m.includes('dall-e-2')) return '1024x1024';
  if (aspectRatio === '16:9') return '1792x1024';
  if (aspectRatio === '9:16') return '1024x1792';
  return '1024x1024';
}

/**
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} [params.aspectRatio]
 * @param {string} params.apiKey
 * @param {string} [params.model] — from DB `provider_models.openai`, else env `OPENAI_IMAGE_MODEL`, else dall-e-3
 */
export async function generateWithOpenAI({ prompt, aspectRatio = '1:1', apiKey, model: modelParam }) {
  const model =
    (typeof modelParam === 'string' && modelParam.trim()) ||
    process.env.OPENAI_IMAGE_MODEL?.trim() ||
    'dall-e-3';
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

  const item = json?.data?.[0];
  const imageUrl = item?.url;
  if (!imageUrl) {
    throw new Error('OpenAI image generation: no URL in response (b64_json not supported here yet)');
  }

  const [w, h] = size.split('x').map((n) => parseInt(n, 10));
  return {
    imageUrl,
    width: Number.isFinite(w) ? w : 1024,
    height: Number.isFinite(h) ? h : 1024,
    format: 'PNG',
    promptUsed: prompt,
  };
}
