-- Migration: Add phone number to Users and Tenants
-- Used for notifications (WhatsApp)

ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE tenants ADD COLUMN phone TEXT;
