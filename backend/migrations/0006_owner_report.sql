-- Migration: Owner Report Support

-- 1. Create table for daily property statistics
CREATE TABLE property_daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    UNIQUE(property_id, date),
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Index for efficient weekly aggregation
CREATE INDEX idx_stats_property_date ON property_daily_stats(property_id, date);

-- 2. Add owner contact info to properties table
ALTER TABLE properties ADD COLUMN owner_name TEXT;
ALTER TABLE properties ADD COLUMN owner_phone TEXT; -- WhatsApp compatible format (e.g. 5511999999999)
ALTER TABLE properties ADD COLUMN owner_email TEXT;
ALTER TABLE properties ADD COLUMN last_report_sent_at DATETIME;
