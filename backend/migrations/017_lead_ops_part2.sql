-- Migration Part 2: Add remaining Lead Ops columns
-- assigned_to was already added.

ALTER TABLE leads ADD COLUMN last_interaction_at DATETIME;
ALTER TABLE leads ADD COLUMN follow_up_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN stage TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN next_follow_up_at DATETIME;
