-- Seed for Production (OInbox)

-- 1. Create Default Tenant (Admin Organization)
INSERT OR IGNORE INTO tenants (id, name, owner_name, email, plan, status, joined_at, subscription_end, balance, discount_plan)
VALUES (
    'tenant_default_001',
    'OInbox Admin Org',
    'Super Admin',
    'admin@oinbox.com',
    'Enterprise',
    'Active',
    CURRENT_TIMESTAMP,
    '2030-01-01T00:00:00Z',
    1000.00,
    0.0
);

-- 2. Create Default Admin User
-- Senha hashed com bcrypt (NUNCA usar plaintext, mesmo em dev)
INSERT OR IGNORE INTO users (id, tenant_id, name, email, phone, password_hash, role)
VALUES (
    'user_admin_001',
    'tenant_default_001',
    'Super Admin',
    'admin@oinbox.com',
    '+5511999999999',
    '$2b$10$hxbssL82kuygsy.pA1kxeOU4YqM1XECeFkSYkmwNUhsfAcetrgOYK',
    'super_admin'
);

-- ============================================================
-- Test Client (Portal do Cliente)
-- ============================================================
-- Email: cliente@teste.com
-- Senha: 123456 (hash bcrypt gerado automaticamente)
-- Login: POST /api/auth/client/login
INSERT OR IGNORE INTO clients (id, tenant_id, name, email, phone, password_hash, status, score)
VALUES (
    'client_prod_001',
    'tenant_default_001',
    'Maria Cliente',
    'cliente@oinbox.com',
    '+5511966666666',
    '$2b$10$hxbssL82kuygsy.pA1kxeOU4YqM1XECeFkSYkmwNUhsfAcetrgOYK',
    'Novo',
    50
);
