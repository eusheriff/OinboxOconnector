-- Migration: Qualification Rules & Search History
-- Created: 2026-01-10

-- Critérios de qualificação configuráveis
CREATE TABLE IF NOT EXISTS qualification_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Critérios de pontuação
  min_rating REAL DEFAULT 4.0,
  min_reviews INTEGER DEFAULT 10,
  required_keywords TEXT, -- JSON: ["imobiliária", "corretor", "imóveis"]
  excluded_keywords TEXT, -- JSON: ["franquia", "construtora"]
  required_has_phone BOOLEAN DEFAULT TRUE,
  required_has_website BOOLEAN DEFAULT FALSE,
  
  -- Peso no score final (0-100)
  weight INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de buscas no Google Places
CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  location TEXT, -- Ex: "São Paulo, SP"
  radius_km INTEGER DEFAULT 10,
  place_type TEXT DEFAULT 'real_estate_agency', -- Tipo do Google Places
  
  -- Resultados
  results_count INTEGER DEFAULT 0,
  new_leads_count INTEGER DEFAULT 0, -- Quantos eram novos
  duplicates_count INTEGER DEFAULT 0, -- Quantos já existiam
  
  -- Status
  status TEXT DEFAULT 'completed', -- pending, running, completed, failed
  error_message TEXT,
  
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  executed_by TEXT -- ID do usuário que executou
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_qualification_rules_active ON qualification_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_search_history_executed_at ON search_history(executed_at DESC);

-- Dados iniciais: Regras padrão de qualificação
INSERT OR IGNORE INTO qualification_rules (id, name, description, min_rating, min_reviews, weight, is_active)
VALUES 
  ('rule_rating', 'Rating Mínimo', 'Leads com rating >= 4.0 ganham pontos', 4.0, 0, 25, 1),
  ('rule_reviews', 'Volume de Reviews', 'Leads com >= 10 reviews ganham pontos', 0, 10, 20, 1),
  ('rule_phone', 'Tem Telefone', 'Leads com telefone disponível ganham pontos', 0, 0, 30, 1),
  ('rule_website', 'Tem Website', 'Leads com website ganham pontos extras', 0, 0, 15, 1),
  ('rule_keywords', 'Keywords Positivas', 'Leads com palavras-chave relevantes ganham pontos', 0, 0, 10, 1);
