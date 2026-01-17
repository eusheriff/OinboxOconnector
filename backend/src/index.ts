import { Hono } from 'hono';
import { ScheduledEvent, ExecutionContext } from '@cloudflare/workers-types';
import { handleEmail } from './email-handler';
import { cors } from 'hono/cors';
import { Bindings, Variables } from './types';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import clientRoutes from './routes/client';
import crmRoutes from './routes/crm';
import propertiesRoutes from './routes/properties';
import platformRoutes from './routes/platform';
import billingRoutes from './routes/billing';
import portalsRoutes from './routes/portals';
import { aiRoutes } from './routes/ai';
import whatsappRoutes from './routes/whatsapp';
import usersRoutes from './routes/users';
import marketingRoutes from './routes/marketing';
import contractsRoutes from './routes/contracts';
import financeRoutes from './routes/finance';
import prospectingRoutes from './routes/prospecting';
// SuperAdmin Lead Capture Routes
import leadsRoutes from './routes/leads';
import placesRoutes from './routes/places';
import campaignsRoutes from './routes/campaigns';
import evolutionRoutes from './routes/evolution';
import qualificationsRoutes from './routes/qualifications';
// Enterprise Lead Marketplace
import buyerLeadsRoutes from './routes/buyer-leads';
import stripeRoutes from './routes/stripe';
import { errorLoggingMiddleware, requestLoggingMiddleware } from './middleware/logging';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS Middleware - Dynamic based on environment
// CORS Middleware - Permissive for Debugging
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'Upgrade-Insecure-Requests'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    exposeHeaders: ['Content-Length', 'x-request-id'],
    maxAge: 600,
    credentials: true,
  }),
);

// FORCED OPTIONS HANDLER (Nuclear Fix for 404 Preflight)
app.options('/*', (c) => {
  return c.text('', 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id',
  });
});

// Middlewares Globais de Logging e Erro (MONITORAMENTO TOTAL)
app.use('/*', errorLoggingMiddleware);
app.use('/*', requestLoggingMiddleware);

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/client', clientRoutes);
app.route('/api/crm', crmRoutes);
app.route('/api/properties', propertiesRoutes);
app.route('/api/portals', portalsRoutes);
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

// Health Check
app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));


import { generateWeeklyReport } from './services/reportService';
import { createDatadogLogger } from './utils/datadog';
import { processFollowUps } from './services/leadOpsService';

// Exported handler for Cron Triggers
export default {
  fetch: app.fetch,
  email: handleEmail,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const logger = createDatadogLogger(env);
    ctx.waitUntil(
        (async () => {
             await logger?.info('Cron Trigger started: Weekly Owner Report');
             // 1. Get all active tenants
             const tenants = await env.DB.prepare("SELECT id FROM tenants WHERE status = 'Active'")
                .all<{id: string}>();
             
             // 2. Generate report for each
             for (const tenant of tenants.results) {
                 await generateWeeklyReport(env, tenant.id);
             }
             
             // 3. Lead Ops: Process Follow-ups
             await logger?.info('Cron Trigger: Processing Lead Follow-ups');
             await processFollowUps(env);
             
             await logger?.info('Cron Trigger finished');

        })()
    );
  }
};
