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
