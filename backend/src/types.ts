import { Context } from 'hono';

// Database interface (compatible with D1 and better-sqlite3 adapter)
// Database interface (compatible with D1 and better-sqlite3 adapter)
export interface D1PreparedStatement {
  bind(...params: (string | number | boolean | null | undefined)[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run<T = unknown>(): Promise<{ meta: { changes: number; last_row_id: number }; results: T[] }>;
}

export interface DatabaseBinding {
  prepare(sql: string): D1PreparedStatement;
}

// Storage interface (compatible with R2 and local storage)
export interface StorageBinding {
  put(key: string, value: ReadableStream | ArrayBuffer | string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream } | null>;
  delete(key: string): Promise<void>;
}

export type Bindings = {
  DB: DatabaseBinding;
  IMAGES: StorageBinding | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AI: any; // Cloudflare AI binding or null in Node.js
  JWT_SECRET: string;
  API_KEY: string; // Gemini API Key
  DATADOG_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_BASIC?: string;
  RESEND_API_KEY?: string;
  // Evolution API (WhatsApp)
  EVOLUTION_API_URL?: string;
  EVOLUTION_API_KEY?: string;
  // Worker Public URL (for webhooks)
  PUBLIC_WORKER_URL?: string;
  // Stripe Add-on Prices
  STRIPE_PRICE_EXTRA_SEAT?: string;
  STRIPE_PRICE_EXTRA_AI?: string;
  // Google APIs
  GOOGLE_PLACES_API_KEY?: string;
  GOOGLE_GEMINI_API_KEY?: string;
  // Quotas e Limites
  PLACES_MONTHLY_LIMIT?: string;
};

import { DatadogLogger } from './utils/datadog';

export type Variables = {
  user: {
    sub: string;
    tenantId: string;
    role: string;
    name: string;
    email: string;
  };
  requestId: string;
  logger: DatadogLogger | null;
};

export type HonoContext = Context<{ Bindings: Bindings; Variables: Variables }>;
