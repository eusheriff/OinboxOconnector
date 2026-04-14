import { Context, Next } from 'hono';
import { Bindings, Variables } from '../bindings';

/**
 * Middleware de tenant enforcement autom√°tico.
 *
 * Garante que o tenant_id do contexto (JWT) seja injetado como
 * vari√°vel de contexto para todas as queries subsequentes.
 *
 * Uso nas rotas: ler c.get('user').tenantId ao inv√©s de confiar
 * em header x-tenant-id ou par|metros do request.
 *
 * Este middleware N√O filtra queries automaticamente ‚ ele garante
 * que o tenant correto esteja no contexto para que as rotas o usem.
 */
export const tenantEnforcementMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next,
) => {
  const user = c.get('user');

  if (!user || !user.tenantId) {
    return c.json({ error: 'Forbidden: No tenant context' }, 403);
  }

  // Validar que x-tenant-id header (se presente) bate com o JWT
  const headerTenant = c.req.header('x-tenant-id');
  if (headerTenant && headerTenant !== user.tenantId) {
    console.warn('[TenantEnforcement] Tenant mismatch detected', {
      jwtTenant: user.tenantId,
      headerTenant: headerTenant,
      userId: user.sub,
    });
    return c.json({ error: 'Forbidden: Tenant mismatch' }, 403);
  }

  await next();
};
