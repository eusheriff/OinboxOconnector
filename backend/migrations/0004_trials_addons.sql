-- Migration: Trial Fingerprints + Add-ons
-- Run with: npx wrangler d1 execute oinbox-db --file=backend/migrations/002_trials_addons.sql

-- 1. Trial Fingerprints (Anti-Fraud)
CREATE TABLE IF NOT EXISTS trial_fingerprints (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    phone TEXT,
    device_id TEXT,
    tenant_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email),
    UNIQUE(phone)
);
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_email ON trial_fingerprints(email);
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_phone ON trial_fingerprints(phone);
CREATE INDEX IF NOT EXISTS idx_trial_fingerprints_device ON trial_fingerprints(device_id);

-- 2. Add-ons (Extra seats, AI messages, etc)
CREATE TABLE IF NOT EXISTS addons (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'extra_seat' | 'extra_ai'
    quantity INTEGER DEFAULT 1,
    stripe_subscription_id TEXT, -- For recurring add-ons
    status TEXT DEFAULT 'active', -- 'active' | 'canceled'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_addons_tenant ON addons(tenant_id);
