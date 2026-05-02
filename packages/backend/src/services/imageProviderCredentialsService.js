import { supabaseAdmin } from '../config/supabase.js';
import { encryptAppSecret, decryptAppSecret } from '../crypto/appSecretCrypto.js';
import { assertValidCredentialProvider } from '../config/imageProviders.js';

/**
 * List credential rows without decrypting (admin UI).
 */
export async function listImageProviderCredentialsMeta() {
  const { data, error } = await supabaseAdmin
    .from('image_provider_credentials')
    .select('id, provider, label, key_version, created_at, updated_at')
    .order('provider', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Upsert encrypted API key for a provider (plaintext only in transit to this function).
 */
export async function upsertImageProviderCredential(provider, apiKey, label = null) {
  assertValidCredentialProvider(provider);
  const trimmed = String(apiKey || '').trim();
  if (!trimmed) throw new Error('apiKey is required');

  const { ciphertext, iv, authTag, keyVersion } = encryptAppSecret(trimmed);

  const { data, error } = await supabaseAdmin
    .from('image_provider_credentials')
    .upsert(
      {
        provider,
        label: label != null ? String(label).trim() || null : null,
        ciphertext,
        iv,
        auth_tag: authTag,
        key_version: keyVersion,
      },
      { onConflict: 'provider' }
    )
    .select('id, provider, label, key_version, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteImageProviderCredential(provider) {
  assertValidCredentialProvider(provider);
  const { error } = await supabaseAdmin.from('image_provider_credentials').delete().eq('provider', provider);
  if (error) throw error;
  return true;
}

/**
 * @returns {Promise<string>}
 */
export async function getDecryptedApiKey(provider) {
  assertValidCredentialProvider(provider);
  const { data, error } = await supabaseAdmin
    .from('image_provider_credentials')
    .select('ciphertext, iv, auth_tag, key_version')
    .eq('provider', provider)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`No API key configured for provider "${provider}"`);

  return decryptAppSecret({
    ciphertext: data.ciphertext,
    iv: data.iv,
    authTag: data.auth_tag,
    keyVersion: data.key_version,
  });
}
