import {
  upsertUserDevice,
  listUserDevices,
  getUserDeviceByDeviceId,
  updateUserDeviceByDeviceId,
  deleteUserDeviceByDeviceId,
} from '../services/userDeviceService.js';

export async function upsertUserDeviceHandler(req, res) {
  try {
    const device = await upsertUserDevice(req.user.id, req.body);
    return res.status(201).json({ success: true, data: device });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function listUserDevicesHandler(req, res) {
  try {
    const devices = await listUserDevices(req.user.id);
    return res.json({ success: true, data: devices });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getUserDeviceHandler(req, res) {
  try {
    const device = await getUserDeviceByDeviceId(req.user.id, req.params.deviceId);
    return res.json({ success: true, data: device });
  } catch (err) {
    const status = err.message === 'Device not found' ? 404 : 500;
    return res.status(status).json({ success: false, error: err.message });
  }
}

export async function updateUserDeviceHandler(req, res) {
  try {
    const device = await updateUserDeviceByDeviceId(req.user.id, req.params.deviceId, req.body);
    return res.json({ success: true, data: device });
  } catch (err) {
    const status =
      err.message === 'Device not found' ? 404 : err.message === 'No valid fields to update' ? 400 : 500;
    return res.status(status).json({ success: false, error: err.message });
  }
}

export async function deleteUserDeviceHandler(req, res) {
  try {
    await deleteUserDeviceByDeviceId(req.user.id, req.params.deviceId);
    return res.json({ success: true, message: 'Device deleted successfully' });
  } catch (err) {
    const status = err.message === 'Device not found' ? 404 : 500;
    return res.status(status).json({ success: false, error: err.message });
  }
}
