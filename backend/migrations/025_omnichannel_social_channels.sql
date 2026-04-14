-- 025_omnichannel_social_channels.sql
-- Adiciona suporte a canais sociais com OAuth (Facebook, Instagram, X, Telegram, TikTok, Line)
-- Esta migração é idempotente - pode ser executada múltiplas vezes

-- 1. Tabela de tokens OAuth por canal
CREATE TABLE IF NOT EXISTS channel_oauth_tokens (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    expires_at DATETIME,
    page_id TEXT,
    page_name TEXT,
    bot_username TEXT,
    account_id TEXT,
    raw_token_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    UNIQUE(channel_id, provider)
);

-- 2. Webhook configs por canal
CREATE TABLE IF NOT EXISTS channel_webhook_configs (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    webhook_url TEXT,
    verify_token TEXT,
    webhook_id TEXT,
    app_id TEXT,
    app_secret TEXT,
    is_webhook_registered BOOLEAN DEFAULT FALSE,
    last_verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    UNIQUE(channel_id, provider)
);

-- 3. Tabela de métricas de canal
CREATE TABLE IF NOT EXISTS channel_metrics (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    messages_sent_today INTEGER DEFAULT 0,
    messages_received_today INTEGER DEFAULT 0,
    active_conversations INTEGER DEFAULT 0,
    last_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    rate_limit_hits INTEGER DEFAULT 0,
    webhook_failures INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, provider)
);

-- 4. Tabela de refresh de tokens
CREATE TABLE IF NOT EXISTS token_refresh_queue (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    token_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

-- 5. �ndices
CREATE INDEX IF NOT EXISTS idx_channel_oauth_tokens_channel ON channel_oauth_tokens(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_oauth_tokens_provider ON channel_oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_channel_oauth_tokens_expires ON channel_oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_channel_webhook_configs_channel ON channel_webhook_configs(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_webhook_configs_provider ON channel_webhook_configs(provider);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_tenant ON channel_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_metrics_provider ON channel_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_token_refresh_queue_status ON token_refresh_queue(status);
CREATE INDEX IF NOT EXISTS idx_token_refresh_queue_scheduled ON token_refresh_queue(scheduled_at);
