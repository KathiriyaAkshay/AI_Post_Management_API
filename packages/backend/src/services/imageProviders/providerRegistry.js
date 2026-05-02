import { generateWithMock } from './mockAdapter.js';
import { generateWithExternalHttp } from './externalHttpAdapter.js';
import { generateWithOpenAI } from './openaiAdapter.js';
import { generateWithGoogle } from './googleAdapter.js';
import { generateWithGrok } from './grokAdapter.js';
import { IMAGE_PROVIDER_IDS } from '../../config/imageProviders.js';

/**
 * Registry of provider id → adapter entrypoint. Same function signature as today:
 * `(params) => Promise<{ imageUrl, width, height, format, promptUsed, metadata? }>`
 */
export const IMAGE_PROVIDER_RUNNERS = {
  mock: generateWithMock,
  external_http: generateWithExternalHttp,
  openai: generateWithOpenAI,
  google: generateWithGoogle,
  grok: generateWithGrok,
};

/**
 * @param {string} providerId
 * @returns {(params: object) => Promise<object>}
 */
export function getImageProviderRunner(providerId) {
  const id = typeof providerId === 'string' ? providerId.trim() : '';
  if (id && IMAGE_PROVIDER_RUNNERS[id]) return IMAGE_PROVIDER_RUNNERS[id];
  return IMAGE_PROVIDER_RUNNERS.mock;
}

export function listRegisteredImageProviders() {
  return [...IMAGE_PROVIDER_IDS];
}
