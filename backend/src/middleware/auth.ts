import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { HTTPException } from 'hono/http-exception';
import { Bindings, Variables } from '../bindings';

export const authMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next,
) => {
  const jwtSecret = c.env.JWT_SECRET;
  const authHeader = c.req.header('Authorization');
  const method = c.req.method;
  const path = c.req.path;
  console.log(`[Auth] ${method} ${path} | Header: ${authHeader ? `"${authHeader.substring(0, 30)}..."` : 'MISSING'} | Secret: ${jwtSecret ? 'SET' : 'MISSING'}`);

  if (!jwtSecret) {
    console.error('[Auth] JWT_SECRET not set');
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[Auth] No Bearer token. Header: ${authHeader}`);
    return c.json({ error: 'Unauthorized: No Bearer token' }, 401);
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
    const normalizedRole = payload.role?.toString().toLowerCase() || '';
    const isSuperAdmin = normalizedRole === 'superadmin' || normalizedRole === 'super_admin';
    
    if (!isSuperAdmin) {
      // Look up Tenant Status
      // Alterado para buscar tanto subscription_end quanto trial_ends_at para resiliência
      const tenant = await c.env.DB.prepare(
        'SELECT subscription_end, trial_ends_at, stripe_subscription_id, plan FROM tenants WHERE id = ?',
      )
        .bind(payload.tenantId as string)
        .first<{
          subscription_end: string | null;
          trial_ends_at: string | null;
          stripe_subscription_id: string | null;
          plan: string;
        }>();

      if (tenant) {
        const now = new Date();
        // Fallback entre subscription_end (schema base) e trial_ends_at (migração 015)
        const expiryStr = tenant.subscription_end || tenant.trial_ends_at;
        const expiryDate = expiryStr ? new Date(expiryStr) : null;
        
        const hasActiveSub = !!tenant.stripe_subscription_id; 
        const isTrialActive = expiryDate && expiryDate > now;

        if (!hasActiveSub && !isTrialActive) {
          console.warn(`[Auth Gate] ACCESS DENIED (402): Subscription/Trial Expired. Tenant: ${payload.tenantId}`);
            
          return c.json(
            {
              error: 'Período de teste expirado. Assine para continuar.',
              code: 'TRIAL_EXPIRED',
              redirect: '/admin/billing',
              debug: {
                tenantId: payload.tenantId,
                expiry: expiryStr,
              }
            },
            402,
          ); // Payment Required
        }
      }
    }
    // =================================
  } catch (error) {
    console.error(`[Auth] JWT verification failed:`, error);
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
