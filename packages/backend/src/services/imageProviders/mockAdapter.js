import { ASPECT_RATIO_DIMENSIONS } from '../../config/imageGenerationDimensions.js';

const MOCK_DUMMY_IMAGE_URL =
  process.env.IMAGE_GENERATION_MOCK_IMAGE_URL?.trim() ||
  'https://picsum.photos/seed/nexus-dummy/1024/1024';

/**
 * @param {{ prompt: string, aspectRatio?: string, generationMode?: string }} params
 */
export async function generateWithMock({ prompt, aspectRatio = '1:1', generationMode }) {
  await new Promise((r) => setTimeout(r, 300));

  const dimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];
  const { width, height } = dimensions;

  return {
    imageUrl: MOCK_DUMMY_IMAGE_URL,
    width,
    height,
    format: 'PNG',
    promptUsed: prompt,
    metadata: {
      provider: 'mock',
      model: 'mock',
      generationMode: generationMode || 'text',
    },
  };
}
