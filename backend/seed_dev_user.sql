-- Insert dev user linked to the default tenant
-- Senha hashed com bcrypt (NUNCA usar plaintext, mesmo em dev)
-- Para gerar um novo hash: node -e "import('bcryptjs').then(m => console.log(m.default.hashSync('SUA_SENHA', 10)))"
INSERT INTO users (id, tenant_id, name, email, phone, password_hash, role)
VALUES (
    'user_dev_001',
    'tenant_default_001',
    'Dev User',
    'dev@oconnector.tech',
    '+5511988888888',
    '$2b$10$dmmdtidT.Ov5Gdfplb3Rq.tbdtqfTScrfZu93zU9ahJiR8UK6KS6O',
    'super_admin'
);

-- ============================================================
-- Test Client (Portal do Cliente)
-- ============================================================
-- Email: cliente@teste.com
-- Senha: 123456 (hash bcrypt gerado automaticamente)
-- Login: POST /api/auth/client/login
INSERT INTO clients (id, tenant_id, name, email, phone, password_hash, status, score)
VALUES (
    'client_dev_001',
    'tenant_default_001',
    'João Cliente',
    'cliente@teste.com',
    '+5511977777777',
    '$2b$10$sMU59eSjz9vB7r71Yom0YuHCN1k.L1wlHF0xobnhUrvYLUKK2JViu',
    'Novo',
    50
);
