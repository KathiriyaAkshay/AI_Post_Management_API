/**
 * Async image generation (202 + BullMQ + WebSocket) is enabled when REDIS_URL is set.
 * Set IMAGE_GENERATION_ASYNC=false to force synchronous 201 even if Redis is configured.
 */
export function isAsyncImageGenerationEnabled() {
  if (process.env.IMAGE_GENERATION_ASYNC === 'false') return false;
  return Boolean(process.env.REDIS_URL?.trim());
}

export function bullmqPrefix() {
  return process.env.BULLMQ_PREFIX || 'bull:nexus';
}
