-- Schema for OInbox SaaS (D1 / SQLite)
-- Habilitar foreign key enforcement (necessário em SQLite)
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS leads;

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
    phone TEXT,
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
    automation_summary TEXT, -- Resumo automatizado sobre o lead
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
    area REAL, -- �rea útil
    total_area REAL,
    condo_value REAL,
    iptu_value REAL,
    publish_to_portals BOOLEAN DEFAULT FALSE,
    portal_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- �ndices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_score ON clients(score DESC);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_id ON properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

CREATE TABLE IF NOT EXISTS processing_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT,
    provider TEXT NOT NULL, -- 'Data Engine' or 'cloudflare'
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_processing_usage_created_at ON processing_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_usage_tenant_id ON processing_usage(tenant_id);

-- (Omnichannel)
CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'whatsapp', 'email', 'livechat'
    name TEXT NOT NULL,
    config TEXT, -- JSON credentials/settings
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_channels_tenant ON channels(tenant_id);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    contact_id TEXT NOT NULL, -- reference to clients.id or leads.id
    contact_type TEXT DEFAULT 'client', -- 'client' or 'lead'
    status TEXT DEFAULT 'open', -- 'open', 'resolved', 'snoozed', 'bot'
    assigned_to TEXT, -- user_id (agent)
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);

CREATE TABLE IF NOT EXISTS omnichannel_messages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- 'contact', 'agent', 'bot', 'system'
    sender_id TEXT, -- client_id, user_id, ou admin_id
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'image', 'document', 'template'
    media_url TEXT,
    external_id TEXT, -- ID na plataforma terceira
    status TEXT DEFAULT 'sent', 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_omni_messages_conversation ON omnichannel_messages(conversation_id);

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

-- whatsapp_messages substituído por omnichannel_messages nativamente

-- 5. Leads (Captura e Lead Ops)
-- Tabela sincronizada com leads.ts e novos requisitos de Lead Ops
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    tenant_id TEXT, -- Pode ser nulo se capturado globalmente, mas idealmente vinculado
    google_place_id TEXT,
    name TEXT NOT NULL,
    type TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    rating REAL,
    reviews_count INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    score_breakdown TEXT, -- JSON
    status TEXT DEFAULT 'new', -- new, qualified, contacted, responded, converted, rejected
    source TEXT DEFAULT 'manual',
    notes TEXT,
    
    -- Colunas Lead Ops
    assigned_to TEXT, -- ID do usuário (corretor)
    last_interaction_at DATETIME,
    follow_up_count INTEGER DEFAULT 0,
    stage TEXT DEFAULT 'new', -- Funil de vendas
    next_follow_up_at DATETIME,
    
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    qualified_at DATETIME,
    contacted_at DATETIME,
    responded_at DATETIME,
    converted_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up_at);

-- 6. Search History (Google Places Quota Control)
CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    query TEXT,
    location TEXT,
    radius_km INTEGER,
    place_type TEXT,
    results_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_search_history_executed_at ON search_history(executed_at);

-- 7. Portal Configs (Multi-Platform Publishing)
CREATE TABLE IF NOT EXISTS portal_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    portal_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    auth_data TEXT, -- JSON com credenciais criptografadas
    xml_url TEXT, -- URL do feed XML para portais que suportam
    webhook_url TEXT, -- URL do webhook para portais que usam webhook
    last_sync DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, portal_id)
);

-- 8. Property Publications (Multi-Platform Publishing)
CREATE TABLE IF NOT EXISTS property_publications (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    portal_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, publishing, published, failed
    external_id TEXT, -- ID do imóvel no portal externo
    external_url TEXT, -- URL do anúncio no portal
    error_message TEXT,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 9. Trial Fingerprints (Anti-Fraud)
CREATE TABLE IF NOT EXISTS trial_fingerprints (
    id TEXT PRIMARY KEY,
    email TEXT,
    phone TEXT,
    device_id TEXT,
    tenant_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email),
    UNIQUE(phone),
    UNIQUE(device_id)
);
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_email ON trial_fingerprints(email);
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_device ON trial_fingerprints(device_id);

-- 10. Rate Limits (para Rate Limiter middleware)
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    window_start INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- 11. Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- draft, active, paused, completed
    type TEXT NOT NULL, -- whatsapp, email
    message_template TEXT,
    target_status TEXT,
    min_score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 100,
    total_leads INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by TEXT, -- user_id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- 12. Campaign Messages
CREATE TABLE IF NOT EXISTS campaign_messages (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT DEFAULT 'queued', -- queued, sent, delivered, read, replied, failed
    error_message TEXT,
    queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    replied_at DATETIME,
    failed_at DATETIME,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON campaign_messages(status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_lead ON campaign_messages(lead_id);

-- 14. Collaboration Tools
CREATE TABLE IF NOT EXISTS canned_responses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    shortcut TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, shortcut)
);
CREATE INDEX IF NOT EXISTS idx_canned_responses_tenant ON canned_responses(tenant_id);
-- 13. Notifications (para alertas internos, ex: human handover)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT, -- destinatário (NULL = todos os admins do tenant)
    type TEXT NOT NULL, -- handover, campaign_failed, trial_expiring, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata TEXT, -- JSON com contexto adicional
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, is_read) WHERE is_read = FALSE;

-- �ndices de tabelas intermediárias (definidos aqui após CREATE TABLE)
CREATE INDEX IF NOT EXISTS idx_omni_messages_tenant_id ON omnichannel_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_messages_created_at ON omnichannel_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processing_usage_tenant_date ON processing_usage(tenant_id, created_at DESC);

-- �ndices finais
CREATE INDEX IF NOT EXISTS idx_portal_configs_tenant ON portal_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_configs_portal ON portal_configs(portal_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_property ON property_publications(property_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_tenant ON property_publications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_portal ON property_publications(portal_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_status ON property_publications(status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_status ON campaign_messages(campaign_id, status);
