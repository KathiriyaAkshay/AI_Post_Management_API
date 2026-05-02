import { getGenerationRetrySettingsCached } from './imageGenerationSettingsService.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toRetryDelayMs(attempt, cfg, retryAfterMs) {
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.min(cfg.max_delay_ms, Math.max(100, Math.trunc(retryAfterMs)));
  }
  const expo = cfg.base_delay_ms * (2 ** Math.max(0, attempt - 1));
  const bounded = Math.min(cfg.max_delay_ms, expo);
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(bounded * 0.2)));
  return bounded + jitter;
}

function isRetryableStatus(status, cfg) {
  return cfg.retry_on_statuses.includes(status);
}

function shouldRetryError(err, cfg) {
  if (err?.isRetryable === true) return true;
  const status = Number(err?.statusCode);
  if (Number.isInteger(status) && isRetryableStatus(status, cfg)) return true;
  const msg = String(err?.message || '').toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('timeout')
    || msg.includes('timed out')
    || msg.includes('rate limit')
    || msg.includes('retry after')
    || msg.includes('too many requests')
    || msg.includes('temporarily unavailable')
    || msg.includes('overloaded')
    || msg.includes('network')
  );
}

/**
 * Wrap provider generation call with retry policy from DB settings.
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
export async function runImageGenerationWithRetry(task) {
  const cfg = await getGenerationRetrySettingsCached();
  if (!cfg?.enabled) return task();

  let lastErr;
  for (let attempt = 1; attempt <= cfg.max_attempts; attempt += 1) {
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      const retryable = shouldRetryError(err, cfg);
      if (!retryable || attempt >= cfg.max_attempts) {
        throw err;
      }
      const delayMs = toRetryDelayMs(attempt, cfg, Number(err?.retryAfterMs));
      console.warn('[generationRetry] retrying image generation', {
        attempt,
        maxAttempts: cfg.max_attempts,
        delayMs,
        statusCode: err?.statusCode || null,
        message: err?.message || 'unknown',
      });
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

