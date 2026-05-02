function parseRetryAfterMs(value) {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs) && secs >= 0) return Math.trunc(secs * 1000);
  const dateMs = Date.parse(String(value));
  if (Number.isNaN(dateMs)) return null;
  const delta = dateMs - Date.now();
  return delta > 0 ? delta : null;
}

export function createProviderHttpError({ provider, operation, status, body, retryAfterHeader = null }) {
  const msg = `${provider} ${operation} failed: ${status}${body ? ` ${String(body).slice(0, 2000)}` : ''}`;
  const err = new Error(msg);
  err.provider = provider;
  err.operation = operation;
  err.statusCode = status;
  err.retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  err.isRetryable = status === 429 || status >= 500;
  return err;
}

export function createProviderNetworkError({ provider, operation, cause }) {
  const err = new Error(`${provider} ${operation} network error: ${cause?.message || cause || 'unknown'}`);
  err.provider = provider;
  err.operation = operation;
  err.statusCode = null;
  err.retryAfterMs = null;
  err.isRetryable = true;
  return err;
}

