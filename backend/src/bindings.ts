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
  PROCESSOR: any; // Cloudflare AI binding or null in Node.js
  JWT_SECRET: string;
  LOCAL_ENGINE_URL?: string; // URL do servidor Local Engine (ex: http://localhost:11434)
  LOCAL_ENGINE_MODEL?: string; // Modelo padrão (ex: gemma4:e2b)
  PRIMARY_ENGINE_API_KEY?: string; // Provider API Key (fallback)
  SECONDARY_ENGINE_API_KEY?: string; // Provider API Key
  DATADOG_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_BASIC?: string;
  RESEND_API_KEY?: string;
  // Evolution API (WhatsApp)
  EVOLUTION_API_URL?: string;
  EVOLUTION_API_KEY?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_CONFIG_ID?: string;
  META_WEBHOOK_VERIFY_TOKEN?: string;
  // Worker Public URL (for webhooks)
  PUBLIC_WORKER_URL?: string;
  // Stripe Add-on Prices
  STRIPE_PRICE_EXTRA_SEAT?: string;
  STRIPE_PRICE_EXTRA_AUTOMATION?: string;
  // Google APIs
  GOOGLE_PLACES_API_KEY?: string;
  // Neon (Postgres) & Upstash (Redis)
  NEON_DATABASE_URL?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
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
