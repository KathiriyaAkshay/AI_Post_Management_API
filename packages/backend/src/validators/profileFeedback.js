/** Max serialized size for feedback JSON payloads (`customer_feedback.payload`). */
const MAX_FEEDBACK_JSON_CHARS = 32768;

/**
 * Ensures feedback is null, or a JSON-serializable object/array within size limits.
 * @param {*} value
 * @throws {Error} with statusCode 400 when invalid
 */
export function assertValidProfileFeedback(value) {
  if (value === undefined) return;
  if (value === null) return;
  if (typeof value !== 'object') {
    const err = new Error('payload must be a JSON object or array');
    err.statusCode = 400;
    throw err;
  }
  let encoded;
  try {
    encoded = JSON.stringify(value);
  } catch {
    const err = new Error('payload must be JSON-serializable');
    err.statusCode = 400;
    throw err;
  }
  if (encoded.length > MAX_FEEDBACK_JSON_CHARS) {
    const err = new Error(
      `payload JSON must be at most ${MAX_FEEDBACK_JSON_CHARS} characters when serialized`
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Like assertValidProfileFeedback but rejects null/undefined (for POST / required payload).
 * @param {*} value
 */
export function assertRequiredFeedbackPayload(value) {
  if (value === undefined || value === null) {
    const err = new Error('payload is required');
    err.statusCode = 400;
    throw err;
  }
  assertValidProfileFeedback(value);
}
