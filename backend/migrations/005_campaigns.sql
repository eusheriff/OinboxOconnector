-- Migration: Campaigns for WhatsApp Outreach
-- Created: 2026-01-10

-- Campanhas de outreach
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  type TEXT DEFAULT 'whatsapp', -- whatsapp, email
  
  -- Template de mensagem
  message_template TEXT NOT NULL,
  variables TEXT, -- JSON: ["nome", "empresa", "rating"]
  
  -- Targeting
  target_status TEXT DEFAULT 'qualified', -- Status dos leads a abordar
  min_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 100,
  
  -- Configuração de envio
  send_delay_seconds INTEGER DEFAULT 30, -- Delay entre mensagens
  max_daily_sends INTEGER DEFAULT 100, -- Limite diário
  
  -- Stats (atualizadas em runtime)
  total_leads INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  paused_at DATETIME,
  completed_at DATETIME
);

-- Mensagens enviadas por campanha
CREATE TABLE IF NOT EXISTS campaign_messages (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  
  -- Conteúdo
  message_content TEXT, -- Mensagem renderizada com variáveis
  
  -- Status de entrega (Evolution API webhooks)
  status TEXT DEFAULT 'pending', -- pending, queued, sent, delivered, read, replied, failed
  error_message TEXT,
  
  -- Timestamps de tracking
  queued_at DATETIME,
  sent_at DATETIME,
  delivered_at DATETIME,
  read_at DATETIME,
  replied_at DATETIME,
  failed_at DATETIME,
  
  -- Resposta do lead
  reply_content TEXT,
  
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_lead ON campaign_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON campaign_messages(status);
