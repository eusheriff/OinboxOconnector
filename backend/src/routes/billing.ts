import { Hono } from 'hono';
import Stripe from 'stripe';
import { Bindings, Variables } from '../bindings';
import { authMiddleware, requireRole } from '../middleware/auth';
import { sendEmail } from '../utils/email';
import { PLANS } from '../config/plans';

const billing = new Hono<{ Bindings: Bindings; Variables: Variables }>();

billing.post('/webhook', async (c) => {
  const env = c.env;
  const logger = c.get('logger');

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return c.text('Stripe not configured', 500);
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const signature = c.req.header('stripe-signature');
  const body = await c.req.text();

  if (!signature) {
    return c.text('Webhook Error: Missing signature', 400);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logger?.error(`Webhook signature verification failed`, { error: errorMsg });
    return c.text('Webhook Error: ' + errorMsg, 400);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.client_reference_id;

    // In a real scenario, you'd look up the price ID to determine the plan.
    // Here we'll use the nickname of the price object, assuming it's set in Stripe (e.g., 'Pro', 'Basic').
    const planName = session.line_items?.data[0]?.price?.nickname || 'Pro';

    if (!tenantId) {
      await logger?.error('Stripe Webhook Error: Missing client_reference_id in session.');
      return c.text('Webhook Error: Missing tenant reference.', 400);
    }

    try {
      await env.DB.prepare("UPDATE tenants SET plan = ?, status = 'Active' WHERE id = ?")
        .bind(planName, tenantId)
        .run();

      await logger?.info(`Tenant subscribed to plan`, { tenantId, planName });

      // Send Confirmation Email
      const user = await env.DB.prepare(
        "SELECT email FROM users WHERE tenant_id = ? AND role = 'admin' LIMIT 1",
      )
        .bind(tenantId)
        .first<{ email: string }>();

      if (user) {
        await sendEmail(
          env,
          user.email,
          'Pagamento Confirmado! �',
          '<h1>Plano ' +
            planName +
            ' Ativo!</h1>' +
            '<p>Obrigado por assinar o Oconnector.tech. Todos os recursos do plano ' +
            planName +
            ' já estão liberados.</p>',
        );
      }
    } catch (dbError) {
      await logger?.error(`Database error updating tenant`, { tenantId, error: dbError });
      // This is a critical failure. You might want to add retry logic or alerts.
      return c.text('Webhook Error: Could not update tenant status.', 500);
    }
  }

  // Handle other subscription events like cancellations or payment failures
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    // It's good practice to find the tenant associated with this subscription and downgrade their plan.
    // This requires storing the `subscription.id` in your tenants table when they first subscribe.
    await logger?.info(`Subscription canceled`, { subscriptionId: subscription.id });
    // Example: await env.DB.prepare("UPDATE tenants SET plan = 'Canceled' WHERE stripe_subscription_id = ?").bind(subscription.id).run();
  }

  return c.text('Received', 200);
});

// Middleware de Auth para outras rotas
// billing.use('*', authMiddleware); // Auth global
// Admin-only: Only tenant admins can access checkout and manage billing
billing.use('/checkout', requireRole('admin'));
billing.use('/subscriptions', requireRole('admin'));

billing.post('/checkout', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user.tenantId;
  const userEmail = user.email;

  if (!env.STRIPE_SECRET_KEY) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const { planName } = await c.req.json(); // ex: Pro

  const priceMap: Record<string, string> = {
    Pro: env.STRIPE_PRICE_PRO || '',
    Basic: env.STRIPE_PRICE_BASIC || '',
  };
  const priceId = priceMap[planName];

  if (!priceId) {
    return c.json({ error: 'Invalid plan name: ' + planName }, 400);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: c.req.header('origin') + '/settings/billing?success=true',
      cancel_url: c.req.header('origin') + '/settings/billing?canceled=true',
      client_reference_id: tenantId, // Crucial link to our DB
      customer_email: userEmail, // Prefill email
    });

    return c.json({ url: session.url });
  } catch (e) {
    const err = e as Error;
    return c.json({ error: err.message }, 500);
  }
});

billing.get('/plans', (c) => {
  // Plans are imported statically

  const plans = Object.values(PLANS).map((p: any) => ({
    id: p.name.toLowerCase(),
    name: p.displayName,
    price: p.price,
    features: [
      `${p.seats} Usuário${p.seats > 1 ? 's' : ''}`,
      `${p.properties >= 999999 ? 'Ilimitados' : p.properties} Imóveis`,
      `${p.photosPerProperty} Fotos/Imóvel`,
      `${p.portals >= 999999 ? 'Todos' : p.portals} Portal${p.portals > 1 ? 'is' : ''}`,
      `${p.leadsPerMonth >= 999999 ? 'Leads Ilimitados' : p.leadsPerMonth + ' Leads/mês'}`,
      `${p.aiMessagesPerMonth} Msgs IA/mês`,
      `Suporte ${p.support === 'email' ? 'Email' : p.support === 'priority' ? 'Prioritário' : 'Dedicado'}`,
    ],
    limits: {
      seats: p.seats,
      properties: p.properties,
      photosPerProperty: p.photosPerProperty,
      portals: p.portals,
      leadsPerMonth: p.leadsPerMonth,
      aiMessagesPerMonth: p.aiMessagesPerMonth,
    },
  }));

  return c.json(plans);
});

billing.get('/subscriptions', (c) => {
  // Mock implementation as per original worker.js
  return c.json([{ id: 1, tenant: 'Test Imob', plan: 'Pro', status: 'Active' }]);
});

// Add-on checkout (Stripe)
billing.post('/addon', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user.tenantId;
  const userEmail = user.email;

  if (!env.STRIPE_SECRET_KEY) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  // Stripe is already imported at the top
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const { addonType, quantity } = await c.req.json();

  // Add-on prices (should be created in Stripe dashboard and stored in env)
  const addonPrices: Record<string, string> = {
    extra_seat: env.STRIPE_PRICE_EXTRA_SEAT || 'price_addon_seat',
    extra_ai: env.STRIPE_PRICE_EXTRA_AUTOMATION || 'price_addon_ai',
  };

  const priceId = addonPrices[addonType];
  if (!priceId) {
    return c.json({ error: 'Invalid addon type' }, 400);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity || 1,
        },
      ],
      mode: 'subscription',
      success_url: c.req.header('origin') + '/settings/billing?addon=success',
      cancel_url: c.req.header('origin') + '/settings/billing?addon=canceled',
      client_reference_id: tenantId,
      customer_email: userEmail,
      metadata: {
        addonType,
        quantity: String(quantity || 1),
      },
    });

    return c.json({ url: session.url });
  } catch (e) {
    const err = e as Error;
    return c.json({ error: err.message }, 500);
  }
});

// Get tenant's active add-ons
billing.get('/addons', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;

  const { results } = await c.env.DB.prepare(
    "SELECT type, SUM(quantity) as total FROM addons WHERE tenant_id = ? AND status = 'active' GROUP BY type",
  )
    .bind(tenantId)
    .all<{ type: string; total: number }>();

  return c.json(results);
});

export default billing;
