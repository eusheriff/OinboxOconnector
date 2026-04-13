-- Migration: Repair Missing Columns (v2)
-- Description: Adiciona apenas as colunas que confirmamos estarem faltando.

-- Adicionar tenant_id e settings em Campaigns
ALTER TABLE campaigns ADD COLUMN tenant_id TEXT;
ALTER TABLE campaigns ADD COLUMN settings TEXT;
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);

-- Adicionar tenant_id em tabelas de acompanhamento
ALTER TABLE campaign_leads ADD COLUMN tenant_id TEXT;
ALTER TABLE campaign_messages ADD COLUMN tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_campaign_leads_tenant ON campaign_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_tenant ON campaign_messages(tenant_id);
