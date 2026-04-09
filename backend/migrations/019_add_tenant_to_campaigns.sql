-- Migration: Add tenant support to campaigns and fix missing table
ALTER TABLE campaigns ADD COLUMN tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);

-- Create campaign_leads if not exists (with tenant_id)
CREATE TABLE IF NOT EXISTS campaign_leads (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    tenant_id TEXT,
    current_step INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, active, completed, stopped
    next_action_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY(lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_tenant ON campaign_leads(tenant_id);
