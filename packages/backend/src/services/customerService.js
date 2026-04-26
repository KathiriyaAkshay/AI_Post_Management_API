import { supabaseAdmin } from '../config/supabase.js';
import { stripe } from '../config/stripe.js';
import { sendCredentialsEmail } from './emailService.js';

/**
 * Creates a customer user via Supabase Admin API, Stripe, and sends credentials email
 */
export async function createCustomer({
  email,
  password,
  username,
  businessName,
  logo,
  logoPosition,
  businessLocations,
  contactNumber,
  address,
}) {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SECRET_KEY required');
  }

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'customer',
        username,
        business_name: businessName,
      },
    });

  if (authError) {
    throw authError;
  }

  // 2. Create Stripe customer
  let stripeCustomerId = null;
  if (stripe) {
    try {
      const stripeCustomer = await stripe.customers.create({
        email,
        name: businessName,
        metadata: {
          user_id: authData.user.id,
          username,
        },
      });
      stripeCustomerId = stripeCustomer.id;
    } catch (stripeError) {
      console.error('Stripe customer creation failed:', stripeError);
      // Continue without Stripe customer - don't fail the whole operation
    }
  }

  // 3. Create profile in database
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: authData.user.id,
      email: authData.user.email,
      username,
      business_name: businessName,
      logo,
      logo_position: logoPosition || 'auto',
      business_locations: Array.isArray(businessLocations) ? businessLocations : [],
      contact_number: contactNumber,
      address,
      role: 'customer',
      stripe_customer_id: stripeCustomerId,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    // If profile creation fails, try to clean up Stripe customer
    if (stripeCustomerId && stripe) {
      try {
        await stripe.customers.del(stripeCustomerId);
      } catch (e) {
        console.error('Failed to cleanup Stripe customer:', e);
      }
    }
    throw profileError;
  }

  // 4. Send credentials email
  try {
    await sendCredentialsEmail(email, username, password, businessName);
  } catch (emailError) {
    console.error('Failed to send credentials email:', emailError);
    // Don't fail the operation if email fails - user is already created
  }

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email,
      username,
      business_name: businessName,
      stripe_customer_id: stripeCustomerId,
    },
  };
}

/**
 * Get all customers (paginated, filtered, excluding deleted)
 */
export async function getCustomers({ page = 1, limit = 10, search = '' }) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'customer')
    .is('deleted_at', null)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%,business_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data,
    meta: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get a single customer by ID
 */
export async function getCustomerById(id) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'customer')
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Customer not found');

  return data;
}

/**
 * Update a customer profile
 */
export async function updateCustomer(id, updates) {
  // Prevent updating restricted fields
  const allowedUpdates = {};
  const allowedFields = [
    'username',
    'business_name',
    'logo',
    'logo_position',
    'business_locations',
    'contact_number',
    'address',
  ];

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      allowedUpdates[field] = updates[field];
    }
  });

  if (allowedUpdates.business_locations !== undefined && !Array.isArray(allowedUpdates.business_locations)) {
    throw new Error('business_locations must be an array');
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(allowedUpdates)
    .eq('id', id)
    .eq('role', 'customer')
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft delete a customer
 */
export async function deleteCustomer(id) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('role', 'customer');

  if (error) throw error;
  return true;
}
