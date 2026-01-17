-- Migration: Create Contracts table for Esteira Digital

CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    property_id TEXT,
    client_id TEXT,
    status TEXT DEFAULT 'Draft', -- Draft, Sent, Signed, Cancelled
    pdf_url TEXT,
    external_id TEXT, -- ID from DocuSign/ClickSign
    content_html TEXT, -- Snapshot of the generated contract
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_client ON contracts(client_id);
