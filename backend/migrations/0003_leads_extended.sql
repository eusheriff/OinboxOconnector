-- Migration: Extended Leads Table for SuperAdmin Lead Capture
-- Created: 2026-01-10

-- Tabela principal de leads capturados via Google Places
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  google_place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT, -- 'imobiliaria' | 'corretor' | 'construtora'
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  rating REAL,
  reviews_count INTEGER DEFAULT 0,
  
  -- Qualificação
  score INTEGER DEFAULT 0, -- 0-100
  score_breakdown TEXT, -- JSON com detalhes do scoring
  status TEXT DEFAULT 'new', -- new, qualified, contacted, responded, converted, rejected
  
  -- Metadados
  source TEXT DEFAULT 'google_places',
  search_query TEXT, -- Query que encontrou este lead
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  qualified_at DATETIME,
  contacted_at DATETIME,
  responded_at DATETIME,
  converted_at DATETIME,
  
  -- WhatsApp (Evolution API)
  whatsapp_status TEXT, -- pending, sent, delivered, read, replied
  whatsapp_jid TEXT, -- WhatsApp JID para Evolution API
  last_message_at DATETIME,
  conversation_id TEXT,
  
  -- Notas e acompanhamento
  notes TEXT,
  assigned_to TEXT -- ID do usuário responsável
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_google_place_id ON leads(google_place_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_captured_at ON leads(captured_at DESC);
