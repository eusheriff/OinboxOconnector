import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { HTTPException } from 'hono/http-exception';
import { Bindings, Variables } from '../bindings';

export const authMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next,
) => {
  const jwtSecret = c.env.JWT_SECRET;
  if (!jwtSecret) {
    // eslint-disable-next-line no-console
    console.error('JWT_SECRET environment variable not set.');
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    // Set user in context variables
    c.set('user', {
      sub: payload.sub as string,
      tenantId: payload.tenantId as string,
      role: payload.role as string,
      name: payload.name as string,
      email: payload.email as string,
    });

    // === TRIAL / SUBSCRIPTION GATE ===
    // Skip for SuperAdmin or if explicitly skipped via Context Logic (future)
    if (payload.role !== 'SuperAdmin' && payload.role !== 'super_admin') {
      // Look up Tenant Status
      const tenant = await c.env.DB.prepare(
        'SELECT trial_ends_at, stripe_subscription_id, plan FROM tenants WHERE id = ?',
      )
        .bind(payload.tenantId as string)
        .first<{
          trial_ends_at: string;
          stripe_subscription_id: string | null;
          plan: string;
        }>();

      if (tenant) {
        const now = new Date();
        const trialEnds = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
        const hasActiveSub = !!tenant.stripe_subscription_id; // Simple check. For robustness, verify status via Stripe webhook sync.
        const isTrialActive = trialEnds && trialEnds > now;

        if (!hasActiveSub && !isTrialActive) {
          console.warn(`[Auth Gate] Access Denied: Trial Expired for Tenant ${payload.tenantId}`);
          return c.json(
            {
              error: 'Período de teste expirado. Assine para continuar.',
              code: 'TRIAL_EXPIRED',
              redirect: '/admin/billing',
            },
            402,
          ); // Payment Required
        }
      }
    }
    // =================================
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
};

export const superAuthMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next,
) => {
  // 1. Run basic auth first (manually waiting for it)
  // Flattened implementation

  const jwtSecret = c.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('[Auth] JWT_SECRET missing in environment');
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[Auth] Missing or invalid Authorization header:', authHeader);
    return c.json({ error: 'Unauthorized: Missing Header' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    c.set('user', {
      sub: payload.sub as string,
      tenantId: payload.tenantId as string,
      role: payload.role as string,
      name: payload.name as string,
      email: payload.email as string,
    });
  } catch (error) {
    console.warn('[Auth] Token verification failed:', error);
    return c.json({ error: 'Unauthorized: Invalid Token' }, 401);
  }

  // 2. Check Role
  const user = c.get('user');
  console.log('[Auth] User authenticated:', user?.email, 'Role:', user?.role);

  if (user?.role !== 'SuperAdmin' && user?.role !== 'super_admin') {
    console.warn('[Auth] Forbidden access attempt by:', user?.email, 'Role:', user?.role);
    return c.json({ error: 'Forbidden: Super Admin access only' }, 403);
  }

  await next();
};

// Factory for role-based middleware
export const requireRole = (...allowedRoles: string[]) => {
  return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const user = c.get('user');
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }
    await next();
  };
};
