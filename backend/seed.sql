-- Seed Data for Dev Environment

-- 1. Create a Dev Tenant
INSERT INTO tenants (id, name, owner_name, email, plan, status, joined_at)
VALUES (
    'tenant-dev',
    'Oconnector Dev',
    'Developer',
    'dev@oconnector.tech',
    'Enterprise',
    'Active',
    CURRENT_TIMESTAMP
);

-- 2. Create the Dev User
-- Password stored in plain text to match the 'legacy fallback' in auth.ts (doesn't start with $2)
INSERT INTO users (id, tenant_id, name, email, password_hash, role)
VALUES (
    'user-dev',
    'tenant-dev',
    'Super Admin',
    'dev@oconnector.tech',
    'Rsg4dr3g44@',
    'SuperAdmin'
);
