import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// Import routes
import auth from './routes/auth';
import { aiRoutes } from './routes/ai';
import admin from './routes/admin';
import crm from './routes/crm';
import { errorLoggingMiddleware, requestLoggingMiddleware } from './middleware/logging';
import { Bindings, Variables } from './types';

// Environment variables
const PORT = parseInt(process.env.PORT || '8787', 10);
console.warn("⚠️  WARNING: This server.ts entrypoint is DEPRECATED and DIVERGENT from production (index.ts). Use 'wrangler dev' instead.");
const DATABASE_URL = process.env.DATABASE_URL || 'file:./data/oinbox.db';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const API_KEY = process.env.API_KEY || '';
const DATADOG_API_KEY = process.env.DATADOG_API_KEY || '';

// Initialize SQLite database
const dbPath = DATABASE_URL.replace('file:', '');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);

// Create tables if not exist
const schemaPath = path.join(__dirname, '../../schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

// Create Hono app
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://oinbox.oconnector.tech',
        'https://www.oinbox.oconnector.tech',
      ];
      if (allowedOrigins.includes(origin || '')) return origin;
      return allowedOrigins[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
);

// Create bindings-like object for compatibility
const createBindings = (): Bindings => ({
  DB: {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql);
      return {
        bind: (...params: (string | number | boolean | null | undefined)[]) => ({
          first: async <T = unknown>(column?: string): Promise<T | null> => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const row = stmt.get(...params) as any;
            if (column && row) return row[column];
            return row as T;
          },
          all: async <T = unknown>(): Promise<{ results: T[] }> => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            results: stmt.all(...params) as any[],
          }),
          // The following line was part of the requested edit, but it's an Express-style error handler
          // and cannot be placed inside this object literal definition.
          // It has been commented out to maintain syntactical correctness.
          // app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
          //   console.error(err.stack);
          //   res.status(500).send('Something broke!');
          // });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          run: async <T = unknown>(): Promise<{
            meta: { changes: number; last_row_id: number };
            results: T[];
          }> => {
            const info = stmt.run(...params);
            return {
              meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) },
              results: [],
            };
          },
        }),
      } as any; // Cast to match D1 signature roughly
    },
  } as any,
  JWT_SECRET,
  API_KEY,
  DATADOG_API_KEY,
  AI: null, // Cloudflare AI not available in Node.js
  IMAGES: null, // R2 not available, use local storage
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
});

// Inject bindings into context
app.use('*', async (c, next) => {
  c.env = createBindings();
  await next();
});

// Logging middleware
app.use('/*', errorLoggingMiddleware);
app.use('/*', requestLoggingMiddleware);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount routes
app.route('/api/auth', auth);
app.route('/api/ai', aiRoutes);
app.route('/api/admin', admin);
app.route('/api/crm', crm);
app.route('/api/clients', crm);

// Start server
// Start server
serve({
  fetch: app.fetch,
  port: PORT,
});
