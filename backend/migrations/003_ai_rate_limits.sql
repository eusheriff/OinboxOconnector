-- Migration: Add AI Rate Limits table
-- Run with: wrangler d1 execute oconnector-db --file=./backend/migrations/003_ai_rate_limits.sql

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  model TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, model, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_lookup 
ON ai_rate_limits(tenant_id, model, date);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_date 
ON ai_rate_limits(date);
