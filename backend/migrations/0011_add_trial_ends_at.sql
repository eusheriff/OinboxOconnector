-- Migration: Add Trial Ends At and Stripe Customer ID
ALTER TABLE tenants ADD COLUMN trial_ends_at DATETIME;
ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN stripe_subscription_id TEXT;
