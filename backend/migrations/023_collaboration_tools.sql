-- 023_collaboration_tools.sql

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
