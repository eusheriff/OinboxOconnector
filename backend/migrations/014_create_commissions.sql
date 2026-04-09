-- Migration: Create Commissions table for Sales Finance

CREATE TABLE commissions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    contract_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    amount REAL NOT NULL, -- Commission amount in BRL
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Paid, Cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (agent_id) REFERENCES users(id)
);

CREATE INDEX idx_commissions_tenant ON commissions(tenant_id);
CREATE INDEX idx_commissions_agent ON commissions(agent_id);
CREATE INDEX idx_commissions_contract ON commissions(contract_id);
