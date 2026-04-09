-- Criação da tabela de prospecção B2B
CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  google_place_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  rating REAL,
  website TEXT,
  status TEXT DEFAULT 'New', -- New, Contacted, Interested, Converted, Rejected
  ai_analysis TEXT,          -- Resumo/Score da IA
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_contact_at DATETIME
);

-- Index para busca rápida por status
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
