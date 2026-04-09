-- Migration: Enterprise Leads (Compradores/Alugadores)
-- Leads disponíveis para tenants do plano Enterprise

-- Leads de compradores/alugadores captados pelo sistema
CREATE TABLE IF NOT EXISTS buyer_leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT DEFAULT 'manual',              -- 'olx', 'vivareal', 'facebook', 'manual'
  interest_type TEXT,                        -- 'compra', 'aluguel'
  property_type TEXT,                        -- 'casa', 'apartamento', 'terreno', 'comercial'
  city TEXT,
  state TEXT DEFAULT 'SP',
  neighborhood TEXT,
  budget_min REAL,
  budget_max REAL,
  bedrooms INTEGER,
  notes TEXT,
  ai_score INTEGER DEFAULT 50,
  status TEXT DEFAULT 'available',           -- 'available', 'expired', 'removed'
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  created_by TEXT                            -- SuperAdmin user ID
);

-- Controle de acesso aos leads por tenant (quem viu/contatou)
CREATE TABLE IF NOT EXISTS lead_access (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  buyer_lead_id TEXT NOT NULL,
  user_id TEXT,                              -- Corretor específico
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  contacted BOOLEAN DEFAULT FALSE,
  contact_notes TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (buyer_lead_id) REFERENCES buyer_leads(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_buyer_leads_city ON buyer_leads(city);
CREATE INDEX IF NOT EXISTS idx_buyer_leads_type ON buyer_leads(interest_type);
CREATE INDEX IF NOT EXISTS idx_buyer_leads_status ON buyer_leads(status);
CREATE INDEX IF NOT EXISTS idx_buyer_leads_captured ON buyer_leads(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_access_tenant ON lead_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_access_lead ON lead_access(buyer_lead_id);
