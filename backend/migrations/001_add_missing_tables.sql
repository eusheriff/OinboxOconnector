-- Migration: 001_add_missing_tables.sql
-- Adiciona tabelas que estavam faltando no schema original
-- Aplicar com: wrangler d1 execute oinbox-db --file=./backend/migrations/001_add_missing_tables.sql

-- Trial Fingerprints (Anti-Fraud)
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

-- Rate Limits (para Rate Limiter middleware)
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    window_start INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    type TEXT NOT NULL,
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
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Campaign Messages
CREATE TABLE IF NOT EXISTS campaign_messages (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
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

-- Notifications (human handover, portal leads, etc.)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_email ON trial_fingerprints(email);
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_device ON trial_fingerprints(device_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON campaign_messages(status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_lead ON campaign_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
