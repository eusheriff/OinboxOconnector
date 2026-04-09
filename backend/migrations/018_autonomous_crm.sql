-- Migration 0014: Autonomous CRM Tables

-- Tabela de Campanhas (Estratégias de Outreach)
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active', -- active, paused, archived
    type TEXT DEFAULT 'outreach', -- outreach, reactivation
    settings TEXT, -- JSON: { "steps": [{ "delay": 0, "type": "pitch" }, { "delay": 24, "type": "followup" }] }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Associação Lead <-> Campanha (Estado do Autopilot)
CREATE TABLE IF NOT EXISTS campaign_leads (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    current_step INTEGER DEFAULT 0, -- Qual passo da campanha o lead está (0 = início)
    status TEXT DEFAULT 'pending', -- pending (aguardando envio), active (em fluxo), completed (fim do fluxo), stopped (respondeu/human), failed
    last_action_at DATETIME,
    next_action_at DATETIME, -- Agendamento do próximo passo
    error_log TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY(lead_id) REFERENCES leads(id)
);

-- Tabela de Histórico de Mensagens da Campanha
CREATE TABLE IF NOT EXISTS campaign_messages (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY(lead_id) REFERENCES leads(id)
);

-- Indexes para performance do Scheduler
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status_next_at ON campaign_leads(status, next_action_at);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id ON campaign_leads(lead_id);
