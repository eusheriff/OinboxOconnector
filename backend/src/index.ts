import { Hono } from 'hono';
import { ScheduledEvent, ExecutionContext } from '@cloudflare/workers-types';
import { handleEmail } from './email-handler';
import { cors } from 'hono/cors';
import { jwtVerify } from 'jose';
import { Bindings, Variables } from './bindings';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import clientRoutes from './routes/client';
import crmRoutes from './routes/crm';
import propertiesRoutes from './routes/properties';
import platformRoutes from './routes/platform';
import billingRoutes from './routes/billing';
import portalsRoutes, { portalsAuth } from './routes/portals';
import { aiRoutes } from './routes/ai';
import whatsappRoutes from './routes/whatsapp';
import usersRoutes from './routes/users';
import marketingRoutes from './routes/marketing';
import contractsRoutes from './routes/contracts';
import financeRoutes from './routes/finance';
import prospectingRoutes from './routes/prospecting';
import leadsRoutes from './routes/leads';
import placesRoutes from './routes/places';
import campaignsRoutes from './routes/campaigns';
import evolutionRoutes from './routes/evolution';
import qualificationsRoutes from './routes/qualifications';
import buyerLeadsRoutes from './routes/buyer-leads';
import notificationsRoutes from './routes/notifications';
import { errorLoggingMiddleware, requestLoggingMiddleware } from './middleware/logging';
import { foreignKeyMiddleware } from './middleware/foreignKey';
import { tenantEnforcementMiddleware } from './middleware/tenantEnforcement';
import { circuitBreakers } from './utils/circuitBreaker';
import { createDatadogLogger } from './utils/datadog';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS Middleware - Proper Allow-List
app.use(
  '/*',
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        'https://oinbox.oconnector.tech',
        'https://www.oinbox.oconnector.tech',
        'https://api.oinbox.oconnector.tech',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
      ];
      if (!origin || allowedOrigins.includes(origin)) return origin || allowedOrigins[0];
      return null; // Block unknown origins
    },
    allowHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    exposeHeaders: ['Content-Length', 'x-request-id'],
    maxAge: 600,
    credentials: true,
  }),
);

// Middlewares Globais de Logging e Erro (MONITORAMENTO TOTAL)
app.use('/*', errorLoggingMiddleware);
app.use('/*', requestLoggingMiddleware);
app.use('/*', foreignKeyMiddleware);

// Auth Global — JWT verification + Trial/Subscription Gate
// O middleware é executado para TODAS as rotas, mas faz skip automático
// para paths que não precisam de auth.
app.use('/*', async (c, next) => {
  const path = c.req.path;
  // Rotas públicas: não precisa de auth
  if (
    path.startsWith('/api/auth') ||
    path === '/api/health' ||
    path.startsWith('/api/health/circuit-breakers') ||
    path.startsWith('/api/whatsapp/webhook') ||
    path.startsWith('/api/portals/feed') ||
    path.startsWith('/api/evolution/webhook')
  ) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: no header' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = c.env.JWT_SECRET;
    if (!jwtSecret) {
      return c.json({ error: 'Server configuration error: JWT_SECRET not set' }, 500);
    }
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    const user = {
      sub: payload.sub as string,
      tenantId: payload.tenantId as string,
      role: payload.role as string,
      name: payload.name as string,
      email: payload.email as string,
    };
    c.set('user', user);

    // === TRIAL / SUBSCRIPTION GATE ===
    const normalizedRole = user.role?.toLowerCase() || '';
    const isSuperAdmin = normalizedRole === 'superadmin' || normalizedRole === 'super_admin';
    
    if (!isSuperAdmin) {
      const tenant = await c.env.DB.prepare(
        'SELECT trial_ends_at, subscription_end, stripe_subscription_id, plan FROM tenants WHERE id = ?',
      )
        .bind(user.tenantId)
        .first<{
          trial_ends_at: string | null;
          subscription_end: string | null;
          stripe_subscription_id: string | null;
          plan: string;
        }>();

      if (tenant) {
        const now = new Date();
        const expiryStr = tenant.subscription_end || tenant.trial_ends_at;
        const trialEnds = expiryStr ? new Date(expiryStr) : null;
        const hasActiveSub = !!tenant.stripe_subscription_id;
        const isTrialActive = trialEnds && trialEnds > now;

        if (!hasActiveSub && !isTrialActive) {
          console.warn(`[Trial Gate] ACCESS DENIED (402) for Tenant: ${user.tenantId}. Expiry: ${expiryStr}`);
          return c.json(
            {
              error: 'Período de teste expirado. Assine para continuar.',
              code: 'TRIAL_EXPIRED',
              redirect: '/admin/billing',
              debug: {
                tenantId: user.tenantId,
                expiry: expiryStr,
              }
            },
            402,
          );
        }
      }
    }
    // =================================

    return next();
  } catch (error) {
    console.error(`[GlobalAuth] JWT verification failed:`, error);
    return c.json({ error: 'Unauthorized: invalid token' }, 401);
  }
});

// Tenant Enforcement — DEPOIS do auth (user já está no contexto)
app.use('/api/admin/*', tenantEnforcementMiddleware);
app.use('/api/client/*', tenantEnforcementMiddleware);
app.use('/api/crm/*', tenantEnforcementMiddleware);
app.use('/api/properties/*', tenantEnforcementMiddleware);
app.use('/api/portals/configs', tenantEnforcementMiddleware);
app.use('/api/portals/configs/*', tenantEnforcementMiddleware);
app.use('/api/portals/validate/*', tenantEnforcementMiddleware);
app.use('/api/portals/bulk-publish', tenantEnforcementMiddleware);
app.use('/api/portals/publications/*', tenantEnforcementMiddleware);
app.use('/api/platform/*', tenantEnforcementMiddleware);
app.use('/api/billing/*', tenantEnforcementMiddleware);
app.use('/api/ai/*', tenantEnforcementMiddleware);
app.use('/api/whatsapp/status', tenantEnforcementMiddleware);
app.use('/api/whatsapp/qrcode', tenantEnforcementMiddleware);
app.use('/api/whatsapp/send', tenantEnforcementMiddleware);
app.use('/api/whatsapp/messages', tenantEnforcementMiddleware);
app.use('/api/whatsapp/reconnect', tenantEnforcementMiddleware);
app.use('/api/whatsapp/logout', tenantEnforcementMiddleware);
app.use('/api/users/*', tenantEnforcementMiddleware);
app.use('/api/marketing/*', tenantEnforcementMiddleware);
app.use('/api/contracts/*', tenantEnforcementMiddleware);
app.use('/api/finance/*', tenantEnforcementMiddleware);
app.use('/api/admin/prospects/*', tenantEnforcementMiddleware);
app.use('/api/leads/*', tenantEnforcementMiddleware);
app.use('/api/places/*', tenantEnforcementMiddleware);
app.use('/api/campaigns/*', tenantEnforcementMiddleware);
app.use('/api/evolution/*', tenantEnforcementMiddleware);
app.use('/api/qualifications/*', tenantEnforcementMiddleware);
app.use('/api/buyer-leads/*', tenantEnforcementMiddleware);
app.use('/api/notifications/*', tenantEnforcementMiddleware);

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/client', clientRoutes);
app.route('/api/crm', crmRoutes);
app.route('/api/properties', propertiesRoutes);
app.route('/api/portals', portalsRoutes);
app.route('/api/portals', portalsAuth);
app.route('/api/platform', platformRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/whatsapp', whatsappRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/marketing', marketingRoutes);
app.route('/api/contracts', contractsRoutes);

app.route('/api/finance', financeRoutes);
app.route('/api/admin/prospects', prospectingRoutes);
// SuperAdmin Lead Capture Routes
app.route('/api/leads', leadsRoutes);
app.route('/api/places', placesRoutes);
app.route('/api/campaigns', campaignsRoutes);
app.route('/api/evolution', evolutionRoutes);
app.route('/api/qualifications', qualificationsRoutes);
// Enterprise Lead Marketplace
app.route('/api/buyer-leads', buyerLeadsRoutes);
app.route('/api/notifications', notificationsRoutes);

// Health Check — com status de dependências
app.get('/api/health', async (c) => {
  const env = c.env;
  const checks: Record<string, { status: string; detail?: string }> = {};

  // D1 Database
  try {
    await env.DB.prepare('SELECT 1 as ok').first<{ ok: number }>();
    checks.d1 = { status: 'ok' };
  } catch (e) {
    checks.d1 = { status: 'error', detail: e instanceof Error ? e.message : String(e) };
  }

  // Agent Hub (via circuit breaker para não agravar falha)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch('https://agent-hub.oconnector.tech/v1/hub/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: 'ping', userId: 'healthcheck' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    checks.agentHub = { status: resp.ok ? 'ok' : `http_${resp.status}` };
  } catch (e) {
    checks.agentHub = { status: 'error', detail: e instanceof Error ? e.message : String(e) };
  }

  // Evolution API
  try {
    if (env.EVOLUTION_API_URL) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(`${env.EVOLUTION_API_URL}/`, { signal: controller.signal });
      clearTimeout(timeout);
      checks.evolutionApi = { status: resp.ok ? 'ok' : `http_${resp.status}` };
    } else {
      checks.evolutionApi = { status: 'not_configured' };
    }
  } catch (e) {
    checks.evolutionApi = { status: 'error', detail: e instanceof Error ? e.message : String(e) };
  }

  const allHealthy = Object.values(checks).every(
    (c) => c.status === 'ok' || c.status === 'not_configured',
  );

  return c.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks,
    },
    allHealthy ? 200 : 503,
  );
});

// Circuit Breaker Metrics — para monitorar saúde dos serviços externos
app.get('/api/health/circuit-breakers', async (c) => {
  const metrics = Object.fromEntries(
    Object.entries(circuitBreakers).map(([name, cb]) => [name, cb.getMetrics()]),
  );

  const anyOpen = Object.values(circuitBreakers).some((cb) => cb.getMetrics().state === 'OPEN');

  return c.json(
    {
      status: anyOpen ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      breakers: metrics,
    },
    anyOpen ? 503 : 200,
  );
});

// Exported handler for Cron Triggers
export default {
  fetch: app.fetch,
  email: handleEmail,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const logger = createDatadogLogger(env);
    ctx.waitUntil(
      (async () => {
        await logger?.info('Cron Trigger started: Autopilot Check');

        // Dynamically import to ensure fresh logic
        const { runAutopilot } = await import('./services/autopilot/scheduler');
        await runAutopilot(env, ctx);

        await logger?.info('Cron Trigger finished');
      })(),
    );
  },
};
