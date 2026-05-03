import Expo from 'expo-server-sdk';
import { listActiveExpoPushTokens } from './userDeviceService.js';

const expo = new Expo(
  process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : {}
);

function assetDisplayName(asset) {
  if (!asset || typeof asset !== 'object') return null;
  const name = typeof asset.name === 'string' ? asset.name.trim() : '';
  return name || null;
}

function previewImageUrl(asset) {
  if (!asset || typeof asset !== 'object') return null;
  const signed =
    typeof asset.image_display_url === 'string' ? asset.image_display_url.trim() : '';
  if (signed.startsWith('https://') || signed.startsWith('http://')) return signed;
  const url = typeof asset.image_url === 'string' ? asset.image_url.trim() : '';
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  return null;
}

/**
 * Sends an Expo push to all registered devices for the profile after image generation succeeds.
 * Errors are logged only — never thrown (safe after queue/WebSocket completion).
 *
 * @param {string} userId
 * @param {{ jobId?: string|null, asset?: object|null }} [opts]
 */
export async function notifyImageGenerationCompleted(userId, opts = {}) {
  if (process.env.DISABLE_PUSH_NOTIFICATIONS === 'true') return;

  const jobId = opts.jobId ?? null;
  const asset = opts.asset ?? null;

  try {
    const tokens = await listActiveExpoPushTokens(userId);
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (validTokens.length === 0) return;

    const assetId = asset && typeof asset.id === 'string' ? asset.id : null;
    const name = assetDisplayName(asset);
    const imageUrl = previewImageUrl(asset);

    const messages = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: 'Your image is ready',
      body: name ? `"${name}" is ready to view.` : 'Your generated image is ready.',
      data: {
        type: 'generation.completed',
        ...(jobId ? { jobId } : {}),
        ...(assetId ? { assetId } : {}),
      },
      ...(imageUrl ? { richContent: { image: imageUrl } } : {}),
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.warn('[push] Expo ticket error', {
            userId,
            jobId,
            message: ticket.message,
            details: ticket.details,
          });
        }
      }
    }
  } catch (err) {
    console.error('[push] notifyImageGenerationCompleted failed', {
      userId,
      jobId,
      message: err?.message || String(err),
    });
  }
}
