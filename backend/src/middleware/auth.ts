import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { HTTPException } from 'hono/http-exception';
import { Bindings, Variables } from '../types';

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

    
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

export const superAuthMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next,
) => {
  await authMiddleware(c, async () => {
    const user = c.get('user');
    if (user?.role !== 'SuperAdmin') {
      // Throwing exception avoids return type mismatch with Next (wait<void>)
      throw new HTTPException(403, { message: 'Forbidden: Super Admin access only' });
    }
    await next();
  });
};

// Factory for role-based middleware
export const requireRole = (...allowedRoles: string[]) => {
  return async (
    c: Context<{ Bindings: Bindings; Variables: Variables }>,
    next: Next,
  ) => {
    const user = c.get('user');
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }
    await next();
  };
};
