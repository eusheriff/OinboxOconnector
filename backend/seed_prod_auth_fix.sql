-- Seed script to fix authentication issues in production
-- 1. Garantir Tenant (Substitua se já existir) com ambas as colunas de data para compatibilidade
INSERT OR REPLACE INTO tenants (id, name, email, plan, status, subscription_end, trial_ends_at)
VALUES (
    '50567a50-b472-4d43-863a-bb91069818b2', 
    'Oinbox Master', 
    'admin@oinbox.com', 
    'SuperAdmin', 
    'Active', 
    '2030-01-01 00:00:00',
    '2030-01-01 00:00:00'
);

-- 2. Garantir Usuário Admin (senha: admin123) com coluna phone opcional
-- Nota: 'phone' pode não existir em algumas versões do banco remoto, 
-- por isso o script tenta ser o mais genérico possível ou o usuário deve rodar migrações primeiro.
INSERT OR REPLACE INTO users (id, tenant_id, name, email, password_hash, role)
VALUES (
    'admin-user-id-123456', 
    '50567a50-b472-4d43-863a-bb91069818b2', 
    'Super Admin', 
    'admin@oinbox.com', 
    '$2a$10$X87I.MSRIOfzI60zXp4K2.W/50u0.7aQ0jB2h4T6.m5Q8wO/N1Z.2', 
    'SuperAdmin'
);

-- 3. Adicionar colaborador dev
INSERT OR REPLACE INTO users (id, tenant_id, name, email, password_hash, role)
VALUES (
    'dev-user-id-999999', 
    '50567a50-b472-4d43-863a-bb91069818b2', 
    'Developer', 
    'dev@oconnector.tech', 
    '$2a$10$X87I.MSRIOfzI60zXp4K2.W/50u0.7aQ0jB2h4T6.m5Q8wO/N1Z.2', 
    'SuperAdmin'
);
