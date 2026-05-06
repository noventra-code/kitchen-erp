-- recipe_mappings table in main database
-- Removed FK to recipes since it may not exist in main DB

CREATE TABLE IF NOT EXISTS recipe_mappings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    invoice_vendor VARCHAR(255) NOT NULL,
    invoice_item_pattern VARCHAR(255) NOT NULL,
    recipe_id INTEGER NOT NULL, -- Removed FK constraint
    confidence_score DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(invoice_vendor, invoice_item_pattern, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_mappings_tenant ON recipe_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mappings_vendor ON recipe_mappings(invoice_vendor);
