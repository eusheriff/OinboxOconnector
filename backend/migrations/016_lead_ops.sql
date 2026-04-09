-- Migration to add Lead Ops columns to leads table
-- Run this if leads table already exists but lacks these columns

ALTER TABLE leads ADD COLUMN assigned_to TEXT;
ALTER TABLE leads ADD COLUMN last_interaction_at DATETIME;
ALTER TABLE leads ADD COLUMN follow_up_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN stage TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN next_follow_up_at DATETIME;
