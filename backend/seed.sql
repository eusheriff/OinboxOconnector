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
-- Senha hashed com bcrypt (NUNCA usar plaintext, mesmo em dev)
INSERT INTO users (id, tenant_id, name, email, password_hash, role)
VALUES (
    'user-dev',
    'tenant-dev',
    'Super Admin',
    'dev@oconnector.tech',
    '$2b$10$dmmdtidT.Ov5Gdfplb3Rq.tbdtqfTScrfZu93zU9ahJiR8UK6KS6O',
    'SuperAdmin'
);

-- ============================================================
-- Test Client (Portal do Cliente)
-- ============================================================
-- Email: cliente@teste.com
-- Senha: 123456 (hash bcrypt gerado automaticamente)
-- Login: POST /api/auth/client/login
INSERT INTO clients (id, tenant_id, name, email, phone, password_hash, status, score)
VALUES (
    'client-dev-001',
    'tenant-dev',
    'João Cliente',
    'cliente@teste.com',
    '+5511977777777',
    '$2b$10$W0W5g.iBWNti1gAK9RyKs.tHXh21KW4kGW6.T1.Ec9gYO3hKWQSOq',
    'Novo',
    50
);
