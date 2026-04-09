# Oinbox Technical Audit (Snapshot 1.0)

## 1. Project Overview

**Oinbox** is a Multi-tenant SaaS for Real Estate Agencies (CRM + WhatsApp Automation).

- **Frontend**: React + Vite + TailwindCSS.
- **Backend**: Cloudflare Workers + Hono.
- **Database**: Cloudflare D1 (SQLite).
- **Communication**: WhatsApp (via Evolution API).
- **Payments**: Stripe.

## 2. Infrastructure ([wrangler.toml](file:///Volumes/LexarAPFS/Oinbox/oinbox/wrangler.toml))

Running on Cloudflare Workers with Cron Triggers (Weekly Reports) and D1 Binding.

```toml
name = "oinbox-backend"
main = "backend/src/index.ts"
compatibility_date = "2024-03-20"
account_id = "4be4fb4784e8a314e28ffdcba74abf25"

# Rota personalizada (API)
routes = [
	{ pattern = "api.oinbox.oconnector.tech", custom_domain = true }
]

[triggers]
crons = ["0 9 * * 5"] # Toda sexta-feira às 09:00 UTC

[[d1_databases]]
binding = "DB"
database_name = "oinbox-db"
database_id = "567a1b9f-6f59-4a6b-953e-89ba1eda2b74"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "oconnector-images"

[ai]
binding = "AI"

[vars]
STRIPE_PRICE_EXTRA_SEAT = "price_1SnTGCBGBVDzrAhzuL7ICFwJ"
STRIPE_PRICE_EXTRA_AI = "price_1SnTGPBGBVDzrAhzL7GPpFqT"
STRIPE_PRICE_PRO = "price_1SnQxcBGBVDzrAhzxO2rdJ31"
STRIPE_PRICE_BASIC = "price_1SnQxUBGBVDzrAhzlMMZwDjM"
```

## 3. Database Schema ([backend/schema.sql](file:///Volumes/LexarAPFS/Oinbox/oinbox/backend/schema.sql))

Multi-tenant architecture where almost every table has `tenant_id`.

```sql
-- Schema for OInbox SaaS (D1 / SQLite)

DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;

-- 1. Tenants (Imobiliárias)
CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_name TEXT,
    email TEXT,
    plan TEXT DEFAULT 'Trial',
    status TEXT DEFAULT 'Active',
    subscription_end DATETIME,
    balance REAL DEFAULT 0.0, -- Saldo/Bônus em R$
    discount_plan REAL DEFAULT 0.0, -- Desconto em %
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Corretores / Admins)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 3. Clients (Leads / Clientes)
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Novo',
    budget REAL,
    score INTEGER DEFAULT 0, -- 0 to 100
    ai_summary TEXT, -- Resumo da IA sobre o lead
    password_hash TEXT, -- Senha para acesso ao portal do cliente
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 4. Properties (Imóveis)
CREATE TABLE properties (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    price REAL,
    location TEXT,
    image_url TEXT,
    listing_type TEXT, -- Venda / Aluguel
    features TEXT, -- JSON String
    description TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    suites INTEGER,
    garage INTEGER,
    area REAL, -- Área útil
    total_area REAL,
    condo_value REAL,
    iptu_value REAL,
    publish_to_portals BOOLEAN DEFAULT FALSE,
    portal_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Índices para performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_id ON properties(tenant_id);

CREATE TABLE IF NOT EXISTS ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT,
    provider TEXT NOT NULL, -- 'gemini' or 'cloudflare'
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_id ON ai_usage(tenant_id);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT,
    client_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);

CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'model'
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);

CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    embedding BLOB, -- Para futuro uso com Vector Search
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant ON knowledge_base(tenant_id);
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT, -- JSON or String
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- JSON Value or String
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rules TEXT, -- JSON: { "plans": ["Pro"], "tenants": ["id1"] }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS broadcasts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, warning, success, error
    target TEXT DEFAULT 'all', -- all, specific_plans, specific_tenants
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    remote_jid TEXT NOT NULL,
    message_id TEXT,
    content TEXT,
    media_url TEXT,
    direction TEXT, -- 'inbound' | 'outbound'
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON whatsapp_messages(remote_jid);
```

## 4. WhatsApp Integration ([whatsapp.ts](file:///Volumes/LexarAPFS/Oinbox/oinbox/backend/src/routes/whatsapp.ts))

Uses Evolution API. Creates unique instances as `tenant_{id}`.

- **Webhook**: Handles `messages.upsert`, saves to DB, triggers AI Agent if inbound.
- **Lazy Creation**: [ensureInstance](file:///Volumes/LexarAPFS/Oinbox/oinbox/backend/src/routes/whatsapp.ts#171-205) creates Evolution session on demand.
- **AI Agent**: RAG based on `knowledge_base` + `chat_history`.

```typescript
// backend/src/routes/whatsapp.ts (Partial - Key Logic)
// ...
const ensureInstance = async (env: Bindings, tenantId: string, logger: DatadogLogger | null) => {
  // ... checks if exists ...
  // If 404, creates:
  const create = await evolutionFetch(env, '/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: instanceName, // tenant_{id}
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: `${webhookBaseUrl}/api/whatsapp/webhook`,
      webhook_by_events: true,
      events: ['messages.upsert'],
    }),
  });
  // ...
};
```

## 5. Stripe Integration ([stripe.ts](file:///Volumes/LexarAPFS/Oinbox/oinbox/backend/src/config/stripe.ts))

Subscription handling logic.

```typescript
// backend/src/routes/stripe.ts
// ...
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],
  success_url:
    successUrl ||
    'https://oinbox.oconnector.tech/admin/billing/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: cancelUrl || 'https://oinbox.oconnector.tech/admin/billing',
  client_reference_id: tenantId,
  customer_email: userEmail,
  metadata: {
    tenantId: tenantId,
    planName: planName,
  },
  allow_promotion_codes: true,
});
// ...
```

## 6. Frontend Routing ([App.tsx](file:///Volumes/LexarAPFS/Oinbox/oinbox/App.tsx) & [index.ts](file:///Volumes/LexarAPFS/Oinbox/oinbox/backend/src/index.ts))

- **SuperAdmin**: `/admin/*` -> [SuperAdminLeadCapture](file:///Volumes/LexarAPFS/Oinbox/oinbox/components/Admin/SuperAdminLeadCapture.tsx#49-645)
- **Client**: `/app/*` -> [ClientLayout](file:///Volumes/LexarAPFS/Oinbox/oinbox/src/layouts/ClientLayout.tsx#11-22)
- **Auth**: `/login`, `/register`
- **Gate**: Trial expiry check blocks usage.

## 7. Status & Readiness

- **Production URL**: `https://oinbox-frontend.pages.dev`
- **API URL**: `https://api.oinbox.oconnector.tech`
- **Lint**: Passed (0 critical errors).

## 8. Deep Dive: Security & Data Isolation (Code Verification)

Here are the critical snippets to verify multi-tenant isolation and billing logic.

### 8.1. Auth Middleware ([backend/src/middleware/auth.ts](file:///Volumes/LexarAPFS/Oinbox/oinbox/backend/src/middleware/auth.ts))

**How Tenant ID is determined**: Extracted from signed JWT. Critical for downstream isolation.

```typescript
// backend/src/middleware/auth.ts
export const authMiddleware = async (c, next) => {
  // ... verify token ...
  const { payload } = await jwtVerify(token, secret);

  // Set user in context variables (TRUSTED SOURCE)
  c.set('user', {
    sub: payload.sub as string,
    tenantId: payload.tenantId as string, // <--- CRITICAL: Source of Truth
    role: payload.role as string,
    // ...
  });
  await next();
  // ...
};
```

### 8.2. Client Data Isolation ([backend/src/routes/client.ts](file:///Volumes/LexarAPFS/Oinbox/oinbox/backend/src/routes/client.ts))

**Usage of Tenant ID**: Injected into SQL queries to prevent data leaks.

```typescript
// backend/src/routes/client.ts
client.get('/dashboard', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId; // Derived from trusted JWT

  // ...
  // ISOLATION CHECK: Filtering properties by tenant_id
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM properties WHERE tenant_id = ? AND price <= ? ...',
  )
    .bind(tenantId, clientData.budget * 1.2) // <--- CRITICAL: Bind Parameter
    .all();
  // ...
});
```

### 8.3. WhatsApp Webhook Validation ([backend/src/routes/whatsapp.ts](file:///Volumes/LexarAPFS/Oinbox/oinbox/backend/src/routes/whatsapp.ts))

**Public Entry Point**: Identifies tenant via `instance` name from Evolution API payload.

```typescript
// backend/src/routes/whatsapp.ts
whatsapp.post('/webhook', async (c) => {
  const payload = await c.req.json();

  // Identificar Tenant pela instância no payload
  // Evolution envia: { "instance": "tenant_123", ... }
  const instanceName = payload.instance;
  let tenantId = 'default';

  if (instanceName && instanceName.startsWith('tenant_')) {
    tenantId = instanceName.replace('tenant_', ''); // <--- CRITICAL: Extraction
  }

  // ... saving message ...
      await env.DB.prepare(
        `INSERT INTO whatsapp_messages (..., tenant_id, ...) VALUES (...)`
      )
        .bind(..., tenantId, ...) // <--- CRITICAL: Persistence
        .run();
  // ...
});
```
