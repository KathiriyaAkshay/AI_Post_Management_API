import { createCustomer } from '../services/customerService.js';

export async function createCustomerHandler(req, res) {
  try {
    const {
      email,
      password,
      username,
      business_name,
      logo,
      contact_number,
      address,
    } = req.body;

    const result = await createCustomer({
      email,
      password,
      username,
      businessName: business_name,
      logo,
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
