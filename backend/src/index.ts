import { Hono } from 'hono';
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

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS Middleware - Dynamic based on environment
app.use('/*', cors({
  origin: (origin) => {
    // Allow localhost for development
    if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
      return origin;
    }
    // Production domains - add your actual domains here
    const allowedOrigins = [
      'https://oconnector.tech',
      'https://www.oconnector.tech',
      'https://oconnector.pages.dev',
      'https://oinbox.oconnector.tech',
    ];
    return allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];
  },
  allowHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

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

// Health Check
app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

export default {
    fetch: app.fetch,
    email: handleEmail
};
