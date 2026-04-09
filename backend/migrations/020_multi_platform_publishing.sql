-- Migration: Adicionar suporte a publicação multi-plataforma
-- Data: 2026-04-08
-- Descrição: Criar tabelas para gerenciar publicações de imóveis em múltiplos portais

-- Tabela de configurações de portais por tenant
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

-- Tabela de publicações de imóveis por portal
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_portal_configs_tenant ON portal_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_configs_portal ON portal_configs(portal_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_property ON property_publications(property_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_tenant ON property_publications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_portal ON property_publications(portal_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_status ON property_publications(status);
