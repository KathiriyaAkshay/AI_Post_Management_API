import { optimizePromptWithOpenAI } from './openaiPromptOptimizer.js';

export const PROMPT_OPTIMIZER_RUNNERS = {
  openai: optimizePromptWithOpenAI,
};

/**
 * @param {string} provider
 * @returns {(params: object) => Promise<string>}
 */
export function getPromptOptimizerRunner(provider) {
  const id = typeof provider === 'string' ? provider.trim() : '';
  if (id && PROMPT_OPTIMIZER_RUNNERS[id]) return PROMPT_OPTIMIZER_RUNNERS[id];
  return null;
}

