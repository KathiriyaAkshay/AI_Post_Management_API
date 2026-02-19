import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not configured. Stripe operations will fail.');
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
