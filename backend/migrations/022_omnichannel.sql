-- 022_omnichannel.sql

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
CREATE INDEX IF NOT EXISTS idx_omni_messages_tenant_id ON omnichannel_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_messages_created_at ON omnichannel_messages(created_at DESC);
