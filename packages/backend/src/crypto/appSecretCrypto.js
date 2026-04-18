import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive 32-byte key from PROVIDER_KEYS_MASTER_KEY (base64 of 32 bytes, or 64 hex chars).
 */
export function getProviderKeysMasterKeyBytes() {
  const raw = process.env.PROVIDER_KEYS_MASTER_KEY?.trim();
  if (!raw) {
    throw new Error('PROVIDER_KEYS_MASTER_KEY is not set (required to encrypt or decrypt provider API keys)');
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length === KEY_LENGTH) return buf;
  throw new Error(
    'PROVIDER_KEYS_MASTER_KEY must be 32 bytes as base64, or 64 hex characters. Generate e.g. `openssl rand -base64 32`'
  );
}

/**
 * @param {string} plaintext
 * @returns {{ ciphertext: string, iv: string, authTag: string, keyVersion: number }}
 */
export function encryptAppSecret(plaintext) {
  const key = getProviderKeysMasterKeyBytes();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: 1,
  };
}

/**
 * @param {{ ciphertext: string, iv: string, authTag: string, keyVersion?: number }} payload
 * @returns {string}
 */
export function decryptAppSecret(payload) {
  const key = getProviderKeysMasterKeyBytes();
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
