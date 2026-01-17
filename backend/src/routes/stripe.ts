
import { Hono } from 'hono';
import Stripe from 'stripe';
import { Bindings, Variables } from '../types';
import { STRIPE_PLANS } from '../config/stripe';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.post('/create-checkout-session', async (c) => {
  const env = c.env;
  
  // LIVE KEY from environment variable
  if (!env.STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    // apiVersion defaults to latest in newer SDKs
    typescript: true,
  });

  try {
    const { planName, interval, successUrl, cancelUrl, tenantId, userEmail } = await c.req.json();

    if (!planName || !interval || !tenantId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const planConfig = STRIPE_PLANS[planName as keyof typeof STRIPE_PLANS];
    if (!planConfig) {
      return c.json({ error: 'Invalid plan' }, 400);
    }

    const priceId = planConfig[interval as keyof typeof planConfig];
    if (!priceId) {
      return c.json({ error: 'Invalid interval' }, 400);
    }

    // Create session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || 'https://oinbox.oconnector.tech/admin/billing/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'https://oinbox.oconnector.tech/admin/billing',
      client_reference_id: tenantId,
      customer_email: userEmail, // Pre-fill email
      metadata: {
        tenantId: tenantId,
        planName: planName,
      },
      allow_promotion_codes: true,
    });

    return c.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
