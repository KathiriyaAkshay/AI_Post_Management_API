/**
 * Image Generation Service
 *
 * Abstraction layer over the external AI image generation API.
 * Swap out the implementation here when plugging in the real provider.
 *
 * Interface:
 *   generateImage(params) => Promise<{ imageUrl, width, height, format, promptUsed }>
 */

/** Single placeholder image URL for mock mode (stored on generated_images.image_url). */
const MOCK_DUMMY_IMAGE_URL =
  process.env.IMAGE_GENERATION_MOCK_IMAGE_URL?.trim() ||
  'https://picsum.photos/seed/nexus-dummy/1024/1024';

const ASPECT_RATIO_DIMENSIONS = {
  '1:1':  { width: 1024, height: 1024 },
  '16:9': { width: 1792, height: 1008 },
  '9:16': { width: 1008, height: 1792 },
  '4:3':  { width: 1024, height: 768 },
};

/**
 * Build the final prompt string from campaign parameters, prompt parts,
 * and user-defined custom sections.
 *
 * @param {object} params
 * @param {string}   params.basePrompt     - Free-text prompt from user
 * @param {string}   params.visualStyle    - e.g. 'photorealistic', 'cinematic'
 * @param {string}   params.mood           - e.g. 'golden_hour', 'vibrant'
 * @param {string}   params.aspectRatio    - e.g. '16:9'
 * @param {boolean}  params.modelEnabled   - Whether to include human model
 * @param {string}   params.genderFocus    - 'male' | 'female' | 'neutral'
 * @param {string[]} params.promptParts    - Prompt parts from the product type
 * @param {Array}    params.customSections - User-defined sections: [{ title, description, prompt_weight }]
 * @returns {string}
 */
export function buildPrompt({ basePrompt = '', visualStyle, mood, modelEnabled, genderFocus, promptParts = [], customSections = [] }) {
  const parts = [];

  if (basePrompt) parts.push(basePrompt);
  if (promptParts.length > 0) parts.push(promptParts.join(', '));
  if (visualStyle && visualStyle !== 'photorealistic') parts.push(visualStyle);
  if (mood) parts.push(mood);
  if (modelEnabled) {
    const genderLabel = genderFocus === 'male' ? 'male model' : genderFocus === 'female' ? 'female model' : 'model';
    parts.push(`featuring a ${genderLabel}`);
  }

  // Inject user-defined custom sections sorted by prompt_weight (high → medium → low)
  const weightOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...customSections].sort(
    (a, b) => (weightOrder[a.prompt_weight] ?? 1) - (weightOrder[b.prompt_weight] ?? 1)
  );
  for (const section of sorted) {
    if (section.description && section.description.trim()) {
      parts.push(section.description.trim());
    }
  }

  return parts.filter(Boolean).join(', ');
}

/**
 * External provider is opt-in (see shouldUseExternalImageGeneration). Otherwise mock uses one dummy image.
 */
export function shouldUseExternalImageGeneration() {
  const enabled = process.env.IMAGE_GENERATION_USE_EXTERNAL === 'true';
  const url = process.env.IMAGE_GENERATION_API_URL?.trim();
  return enabled && Boolean(url);
}

/**
 * @returns {Promise<{ imageUrl: string, width: number, height: number, format: string, promptUsed: string }>}
 */
export async function generateImage({ prompt, visualStyle, aspectRatio = '1:1', mood, modelEnabled, genderFocus, extra = {} }) {
  if (shouldUseExternalImageGeneration()) {
    return callExternalService({ prompt, visualStyle, aspectRatio, mood, modelEnabled, genderFocus, extra });
  }

  return mockGenerate({ prompt, aspectRatio });
}

/**
 * Mock generator — always returns the same dummy image URL; dimensions follow aspect ratio.
 */
async function mockGenerate({ prompt, aspectRatio }) {
  await new Promise((r) => setTimeout(r, 300));

  const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];
  const { width, height } = dimensions;

  return {
    imageUrl: MOCK_DUMMY_IMAGE_URL,
    width,
    height,
    format: 'PNG',
    promptUsed: prompt,
  };
}

/**
 * Real external service call (only when shouldUseExternalImageGeneration() is true).
 * Replace with your provider SDK/API when ready.
 *
 * Env: IMAGE_GENERATION_USE_EXTERNAL=true, IMAGE_GENERATION_API_URL, IMAGE_GENERATION_API_KEY
 */
async function callExternalService({ prompt, visualStyle, aspectRatio, mood, modelEnabled, genderFocus, extra }) {
  const apiUrl = process.env.IMAGE_GENERATION_API_URL;
  const apiKey = process.env.IMAGE_GENERATION_API_KEY;

  const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];

  const response = await fetch(`${apiUrl}/generate`, {
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
