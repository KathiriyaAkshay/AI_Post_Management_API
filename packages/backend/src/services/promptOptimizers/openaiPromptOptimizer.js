import { getDecryptedApiKey } from '../imageProviderCredentialsService.js';
import { createProviderHttpError, createProviderNetworkError } from '../imageProviders/providerError.js';

function normalizePromptText(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

const DEFAULT_SYSTEM_TEMPLATE = [
  'You are an expert image prompt optimizer.',
  'Rewrite the user prompt to be clearer and more effective for modern image generation models.',
  'Preserve all hard constraints and factual details (brand/logo requirements, reference-image usage, safety-sensitive requirements).',
  'Do not add unrelated content.',
  'Return only the optimized prompt text, no markdown and no explanation.',
].join(' ');

/**
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} params.model
 * @param {string} [params.systemTemplate]
 * @param {number} params.temperature
 * @param {number} params.maxTokens
 */
export async function optimizePromptWithOpenAI({ prompt, model, systemTemplate, temperature, maxTokens }) {
  const apiKey = await getDecryptedApiKey('openai');
  const system = typeof systemTemplate === 'string' && systemTemplate.trim()
    ? systemTemplate.trim()
    : DEFAULT_SYSTEM_TEMPLATE;

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_completion_tokens: maxTokens,
      }),
    });
  } catch (err) {
    throw createProviderNetworkError({ provider: 'openai', operation: 'prompt optimization', cause: err });
  }

  const raw = await response.text();
  if (!response.ok) {
    throw createProviderHttpError({
      provider: 'openai',
      operation: 'prompt optimization',
      status: response.status,
      body: raw,
      retryAfterHeader: response.headers.get('retry-after'),
    });
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('Prompt optimization: OpenAI returned invalid JSON');
  }

  const text = normalizePromptText(json?.choices?.[0]?.message?.content);
  if (!text) {
    throw new Error('Prompt optimization: empty output from OpenAI');
  }
  return text;
}

