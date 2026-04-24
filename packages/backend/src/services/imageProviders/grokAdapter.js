/**
 * xAI Grok image generation (OpenAI-compatible images endpoint).
 * @see https://docs.x.ai/docs/guides/image-generation
 */

function grokAspectRatio(aspectRatio) {
  if (aspectRatio === '16:9') return '16:9';
  if (aspectRatio === '9:16') return '9:16';
  if (aspectRatio === '4:3') return '4:3';
  if (aspectRatio === '3:4') return '3:4';
  return '1:1';
}

/** Approximate 1K output sizes (xAI docs align with common 1K presets). */
function dimensionsForAspect(aspectRatio) {
  if (aspectRatio === '16:9') return { width: 1344, height: 768 };
  if (aspectRatio === '9:16') return { width: 768, height: 1344 };
  if (aspectRatio === '4:3') return { width: 1216, height: 832 };
  if (aspectRatio === '3:4') return { width: 832, height: 1216 };
  return { width: 1024, height: 1024 };
}

function xaiBaseUrl() {
  const raw = process.env.XAI_API_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'https://api.x.ai/v1';
}

/**
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} [params.aspectRatio]
 * @param {string} params.apiKey
 * @param {string | null | undefined} [params.model]
 */
export async function generateWithGrok({ prompt, aspectRatio = '1:1', apiKey, model: modelParam, generationMode }) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Grok image generation: missing API key (store an xAI key under admin → grok)');
  }

  const model =
    (typeof modelParam === 'string' && modelParam.trim()) ||
    process.env.GROK_IMAGE_MODEL?.trim() ||
    'grok-imagine-image';

  const base = xaiBaseUrl();
  const resolution = process.env.GROK_IMAGE_RESOLUTION?.trim() || '1k';

  const response = await fetch(`${base}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      response_format: 'url',
      aspect_ratio: grokAspectRatio(aspectRatio),
      resolution,
    }),
  });

  const errText = await response.text();
  if (!response.ok) {
    throw new Error(`Grok image generation failed: ${response.status} ${errText.slice(0, 2000)}`);
  }

  let json;
  try {
    json = JSON.parse(errText);
  } catch {
    throw new Error('Grok image generation: invalid JSON response');
  }

  const item = json?.data?.[0];
  const imageUrl = item?.url;
  const b64 = item?.b64_json;
  if (imageUrl) {
    const { width, height } = dimensionsForAspect(aspectRatio);
    return {
      imageUrl,
      width,
      height,
      format: 'PNG',
      promptUsed: prompt,
      metadata: {
        provider: 'grok',
        model,
        generationMode: generationMode || 'text',
      },
    };
  }
  if (typeof b64 === 'string' && b64.length > 0) {
    const { width, height } = dimensionsForAspect(aspectRatio);
    return {
      imageUrl: `data:image/png;base64,${b64}`,
      width,
      height,
      format: 'PNG',
      promptUsed: prompt,
      metadata: {
        provider: 'grok',
        model,
        generationMode: generationMode || 'text',
      },
    };
  }

  throw new Error('Grok image generation: no url or b64_json in response');
}
