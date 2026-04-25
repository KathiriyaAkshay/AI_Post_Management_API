import * as customerService from '../services/customerService.js';

export async function createCustomerHandler(req, res) {
  try {
    const {
      email,
      password,
      username,
      business_name,
      logo,
      logo_position,
      contact_number,
      address,
    } = req.body;

    const result = await customerService.createCustomer({
      email,
      password,
      username,
      businessName: business_name,
      logo,
      logoPosition: logo_position,
      contactNumber: contact_number,
      address,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: result.user,
        message: 'Customer created successfully. Credentials sent via email.',
      },
    });
  } catch (err) {
    const status = err.status === 422 ? 422 : 400;
    return res.status(status).json({
      success: false,
      error: err.message || 'Customer creation failed',
    });
  }
}

export async function getCustomersHandler(req, res) {
  try {
    const { page, limit, search } = req.query;
    const result = await customerService.getCustomers({ page, limit, search });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getCustomerHandler(req, res) {
  try {
    const result = await customerService.getCustomerById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.message === 'Customer not found' ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function updateCustomerHandler(req, res) {
  try {
    const result = await customerService.updateCustomer(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteCustomerHandler(req, res) {
  try {
    await customerService.deleteCustomer(req.params.id);
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
