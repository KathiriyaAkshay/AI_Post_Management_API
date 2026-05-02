import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isOriginAllowed } from '../config/corsOrigins.js';

/** @param {unknown} val */
function firstHandshakeString(val) {
  if (val == null) return null;
  if (typeof val === 'string' && val.trim()) return val.trim();
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].trim()) return val[0].trim();
  return null;
}

/**
 * Supabase access JWT from Socket.io handshake (first match wins).
 * - `auth.token` — browser / socket.io-client
 * - `Authorization: Bearer <jwt>` — Postman and other HTTP-first tools
 * - Query `token` or `access_token` — last resort (avoid in production URLs when possible)
 *
 * @param {import('socket.io').Socket['handshake']} handshake
 */
export function extractJwtFromSocketHandshake(handshake) {
  const fromAuth = firstHandshakeString(handshake.auth?.token);
  if (fromAuth) return fromAuth.replace(/^Bearer\s+/i, '').trim();

  const authz = firstHandshakeString(handshake.headers?.authorization);
  if (authz) {
    const t = authz.replace(/^Bearer\s+/i, '').trim();
    if (t) return t;
  }

  const q = handshake.query || {};
  const fromQuery =
    firstHandshakeString(q.token) || firstHandshakeString(q.access_token);
  if (fromQuery) return fromQuery.replace(/^Bearer\s+/i, '').trim();

  return null;
}

/**
 * Authenticated Socket.io server for customer image-generation events.
 * Only started when async generation (REDIS_URL) is enabled.
 *
 * Client: JWT via `auth.token`, or `Authorization: Bearer`, or query `token` / `access_token`.
 * Rooms: `user:<userId>` — server emits `generation.completed`, `generation.failed`, optional `generation.progress`.
 *
 * @param {import('http').Server} httpServer
 * @returns {Promise<import('socket.io').Server>}
 */
export async function setupSocketIO(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: (origin, callback) => {
        callback(null, isOriginAllowed(origin));
      },
      credentials: true,
    },
  });

  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  }

  io.use(async (socket, next) => {
    try {
      const token = extractJwtFromSocketHandshake(socket.handshake);
      if (!token) {
        return next(new Error('Unauthorized'));
      }
      const supabaseUrl = process.env.SUPABASE_URL;
      const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !publishableKey) {
        return next(new Error('Server misconfiguration'));
      }
      const supabase = createSupabaseClient(supabaseUrl, publishableKey);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user?.id) {
        return next(new Error('Unauthorized'));
      }
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
  });

  return io;
}
