import { supabaseAdmin } from '../config/supabase.js';

function normalizeUpsertPayload(payload) {
  return {
    device_id: payload.device_id,
    token: payload.token,
    platform: payload.platform ?? null,
    is_active: payload.is_active ?? true,
    last_seen_at: payload.last_seen_at ?? new Date().toISOString(),
  };
}

async function deleteTokenConflicts({ userId, deviceId, token }) {
  if (!token) return;

  const { data: existingByToken, error: tokenLookupError } = await supabaseAdmin
    .from('user_devices')
    .select('id, user_id, device_id')
    .eq('token', token)
    .maybeSingle();

  if (tokenLookupError) throw tokenLookupError;

  if (
    existingByToken &&
    (existingByToken.user_id !== userId || existingByToken.device_id !== deviceId)
  ) {
    const { error: deleteError } = await supabaseAdmin
      .from('user_devices')
      .delete()
      .eq('id', existingByToken.id);

    if (deleteError) throw deleteError;
  }
}

export async function upsertUserDevice(userId, payload) {
  const normalized = normalizeUpsertPayload(payload);
  await deleteTokenConflicts({
    userId,
    deviceId: normalized.device_id,
    token: normalized.token,
  });

  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .upsert(
      {
        user_id: userId,
        ...normalized,
      },
      { onConflict: 'user_id,device_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listUserDevices(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

/** Active Expo/device push tokens for notifications (deduped). */
export async function listActiveExpoPushTokens(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;

  const seen = new Set();
  const out = [];
  for (const row of data || []) {
    const t = typeof row.token === 'string' ? row.token.trim() : '';
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export async function getUserDeviceByDeviceId(userId, deviceId) {
  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Device not found');
  return data;
}

export async function updateUserDeviceByDeviceId(userId, deviceId, updates) {
  const allowedUpdates = {};
  const allowedFields = ['token', 'platform', 'is_active', 'last_seen_at'];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      allowedUpdates[field] = updates[field];
    }
  });

  if (Object.keys(allowedUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  if (allowedUpdates.token) {
    await deleteTokenConflicts({ userId, deviceId, token: allowedUpdates.token });
  }

  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .update(allowedUpdates)
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Device not found');
  return data;
}

export async function deleteUserDeviceByDeviceId(userId, deviceId) {
  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Device not found');
  return true;
}
