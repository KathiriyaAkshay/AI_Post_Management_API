#!/usr/bin/env node
/**
 * Connects Socket.io first (avoids missing push if the worker finishes fast), then POSTs /api/customer/generate.
 *
 * From packages/backend:
 *   ACCESS_TOKEN='<supabase access jwt>' npm run socket:smoke
 *   npm run socket:smoke -- '<jwt>'
 *
 * Env:
 *   API_BASE          default http://localhost:3000
 *   GENERATE_BODY     optional JSON string for POST body
 */
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const token = process.argv[2] || process.env.ACCESS_TOKEN;
const base = (process.env.API_BASE || 'http://localhost:3000').replace(/\/$/, '');

if (!token || typeof token !== 'string' || !token.trim()) {
  console.error('Missing JWT. Usage: ACCESS_TOKEN="<jwt>" npm run socket:smoke');
  console.error('   or: npm run socket:smoke -- "<jwt>"');
  process.exit(1);
}

const trimmed = token.trim();
const body = process.env.GENERATE_BODY
  ? JSON.parse(process.env.GENERATE_BODY)
  : {
      campaignId: '86612d46-b859-4567-af9c-4758c6d89dce',
      name: 'socket-smoke',
    };

const socket = io(base, {
  path: '/socket.io',
  transports: ['websocket'],
  auth: { token: trimmed },
  extraHeaders: {
    Authorization: `Bearer ${trimmed}`,
  },
});

socket.on('connect', () => console.log('[socket] connected', socket.id));
socket.on('connect_error', (err) => {
  console.error('[socket] connect_error', err.message);
  process.exit(1);
});

const done = (code) => {
  socket.close();
  process.exit(code);
};

socket.on('generation.completed', (payload) => {
  console.log('[socket] generation.completed\n', JSON.stringify(payload, null, 2));
  done(0);
});

socket.on('generation.failed', (payload) => {
  console.log('[socket] generation.failed\n', JSON.stringify(payload, null, 2));
  done(1);
});

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('connect timeout')), 15000);
  socket.once('connect', () => {
    clearTimeout(t);
    resolve(undefined);
  });
  socket.once('connect_error', (e) => {
    clearTimeout(t);
    reject(e);
  });
});

await new Promise((r) => setTimeout(r, 200));

const res = await fetch(`${base}/api/customer/generate`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${trimmed}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log('[http]', res.status, text.slice(0, 800));

if (res.status !== 202) {
  console.error('Expected HTTP 202 when REDIS_URL async mode is enabled.');
  done(1);
}

const json = JSON.parse(text);
const jobId = json?.data?.jobId;
console.log('[http] jobId', jobId);
console.log('[socket] waiting for generation.completed | generation.failed (120s)…');

setTimeout(() => {
  console.error('Timeout: no Socket.io completion event. Try GET', `${base}/api/customer/generation-jobs/${jobId}`);
  done(2);
}, 120_000);
