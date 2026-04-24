import http from 'http';
import app from './app.js';
import { isAsyncImageGenerationEnabled } from './config/generationConfig.js';
import { registerGenerationEmitter } from './realtime/generationEvents.js';
import { setupSocketIO } from './socket/socketServer.js';
import {
  startImageGenerationWorker,
  shutdownImageGenerationQueue,
} from './queues/imageGenerationQueue.js';

/** @type {import('socket.io').Server | null} */
let io = null;

export async function startServer() {
  const httpServer = http.createServer(app);

  if (isAsyncImageGenerationEnabled()) {
    io = await setupSocketIO(httpServer);
    registerGenerationEmitter((userId, event, payload) => {
      const room = `user:${userId}`;
      io.to(room).emit(event, payload);
      void (async () => {
        try {
          const sockets = await io.in(room).fetchSockets();
          if (sockets.length === 0) {
            console.warn(
              `[generationEvents] ${event} → ${room}: no Socket.io clients (poll GET /api/customer/generation-jobs/:jobId if needed). Payload still emitted to empty room.`
            );
          }
        } catch (err) {
          console.warn('[generationEvents] fetchSockets:', err?.message || err);
        }
      })();
    });
    startImageGenerationWorker();
    console.log('[server] Async image generation: WebSocket + BullMQ enabled (REDIS_URL set)');
  } else {
    console.log('[server] Image generation: synchronous mode (set REDIS_URL for 202 + WebSocket)');
  }

  const PORT = process.env.PORT || 3000;

  await new Promise((resolve) => {
    httpServer.listen(PORT, resolve);
  });

  console.log(`Server running on port ${PORT}`);

  const shutdown = async () => {
    console.log('[server] Shutting down…');
    await shutdownImageGenerationQueue();
    if (io) {
      await new Promise((resolve) => {
        io.close(() => resolve(undefined));
      });
      io = null;
    }
    await new Promise((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve(undefined)));
    });
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
