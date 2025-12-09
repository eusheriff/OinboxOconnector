import { Hono } from 'hono';
import Stripe from 'stripe';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { sendEmail } from '../utils/email';

const billing = new Hono<{ Bindings: Bindings; Variables: Variables }>();

billing.post('/webhook', async (c) => {
    const env = c.env;
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
        return c.text("Stripe not configured", 500);
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const signature = c.req.header('stripe-signature');
    const body = await c.req.text();

    if (!signature) {
        return c.text("Webhook Error: Missing signature", 400);
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return c.text(`Webhook Error: ${err.message}`, 400);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session: any = event.data.object;
        const tenantId = session.client_reference_id;

        // In a real scenario, you'd look up the price ID to determine the plan.
        // Here we'll use the nickname of the price object, assuming it's set in Stripe (e.g., 'Pro', 'Basic').
        const planName = session.line_items?.data[0]?.price?.nickname || 'Pro';

        if (!tenantId) {
            console.error("Stripe Webhook Error: Missing client_reference_id in session.");
            return c.text("Webhook Error: Missing tenant reference.", 400);
        }

        try {
            await env.DB.prepare(
                "UPDATE tenants SET plan = ?, status = 'Active' WHERE id = ?"
            ).bind(planName, tenantId).run();

            console.log(`Tenant ${tenantId} successfully subscribed to plan ${planName}.`);

            // Send Confirmation Email
            const user: any = await env.DB.prepare("SELECT email FROM users WHERE tenant_id = ? AND role = 'admin' LIMIT 1").bind(tenantId).first();
            if (user) {
                await sendEmail(env, user.email, "Pagamento Confirmado! ✅", `
            <h1>Plano ${planName} Ativo!</h1>
            <p>Obrigado por assinar o Euimob. Todos os recursos do plano ${planName} já estão liberados.</p>
          `);
            }
        } catch (dbError) {
            console.error(`Database error updating tenant ${tenantId}:`, dbError);
            // This is a critical failure. You might want to add retry logic or alerts.
            return c.text("Webhook Error: Could not update tenant status.", 500);
        }
    }

    // Handle other subscription events like cancellations or payment failures
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        // It's good practice to find the tenant associated with this subscription and downgrade their plan.
        // This requires storing the `subscription.id` in your tenants table when they first subscribe.
        console.log(`Subscription ${subscription.id} was canceled.`);
        // Example: await env.DB.prepare("UPDATE tenants SET plan = 'Canceled' WHERE stripe_subscription_id = ?").bind(subscription.id).run();
    }

    return c.text("Received", 200);
});

// Middleware de Auth para outras rotas
billing.use('*', authMiddleware);

billing.post('/checkout', async (c) => {
    const env = c.env;
    const user = c.get('user');
    const tenantId = user.tenantId;
    const userEmail = user.email;

    if (!env.STRIPE_SECRET_KEY) {
        return c.json({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const { planName } = await c.req.json(); // ex: Pro

    // TODO: Replace with your actual Price IDs from your Stripe dashboard
    const priceMap: any = {
        'Pro': 'price_1SWMXiBGBVDzrAhzmztHEzwP', // R$ 500,00
        'Basic': 'price_1SWMXhBGBVDzrAhz9WX01bDR' // R$ 200,00
    };
    const priceId = priceMap[planName];

    if (!priceId) {
        return c.json({ error: `Invalid plan name: ${planName}` }, 400);
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${c.req.header('origin')}/settings/billing?success=true`,
            cancel_url: `${c.req.header('origin')}/settings/billing?canceled=true`,
            client_reference_id: tenantId, // Crucial link to our DB
            customer_email: userEmail, // Prefill email
        });

        return c.json({ url: session.url });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

billing.get('/plans', (c) => {
    return c.json([
        { id: "basic", name: "Basic", price: 99, features: ["1 User", "100 Leads"] },
        { id: "pro", name: "Pro", price: 199, features: ["5 Users", "Unlimited Leads"] },
        { id: "enterprise", name: "Enterprise", price: 499, features: ["Unlimited Users", "Custom Integrations"] }
    ]);
});

billing.get('/subscriptions', (c) => {
    // Mock implementation as per original worker.js
    return c.json([
        { id: 1, tenant: "Test Imob", plan: "Pro", status: "Active" }
    ]);
});

export default billing;
