import { ASPECT_RATIO_DIMENSIONS } from '../../config/imageGenerationDimensions.js';

/**
 * Legacy gateway: POST to IMAGE_GENERATION_API_URL with env IMAGE_GENERATION_API_KEY.
 */
export async function generateWithExternalHttp({
  prompt,
  visualStyle,
  aspectRatio = '1:1',
  mood,
  modelEnabled,
  genderFocus,
  extra = {},
}) {
  const apiUrl = process.env.IMAGE_GENERATION_API_URL?.trim();
  const apiKey = process.env.IMAGE_GENERATION_API_KEY?.trim();
  if (!apiUrl || !apiKey) {
    throw new Error('external_http provider requires IMAGE_GENERATION_API_URL and IMAGE_GENERATION_API_KEY');
  }

  const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      style: visualStyle,
      width: dimensions.width,
      height: dimensions.height,
      mood,
      model_enabled: modelEnabled,
      gender_focus: genderFocus,
      ...extra,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Image generation failed: ${response.status} ${errorBody}`);
  }

  const result = await response.json();

  return {
    imageUrl: result.image_url || result.url,
    width: result.width || dimensions.width,
    height: result.height || dimensions.height,
    format: result.format || 'PNG',
    promptUsed: prompt,
  };
}
