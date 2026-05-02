/** @type {((userId: string, event: string, payload: unknown) => void) | null} */
let emitFn = null;

/**
 * Called once at server bootstrap with a function that emits to Socket.io rooms.
 */
export function registerGenerationEmitter(fn) {
  emitFn = fn;
}

export function emitToUser(userId, event, payload) {
  emitFn?.(userId, event, payload);
}

export function emitGenerationCompleted(userId, jobId, data) {
  emitToUser(userId, 'generation.completed', { jobId, data });
}

export function emitGenerationFailed(userId, jobId, error, code = null) {
  emitToUser(userId, 'generation.failed', { jobId, error, code });
}

export function emitGenerationProgress(userId, jobId, message, pct = null) {
  emitToUser(userId, 'generation.progress', { jobId, message, pct });
}
